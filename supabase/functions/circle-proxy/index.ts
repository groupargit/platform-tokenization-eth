/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CIRCLE_API_BASE = "https://api.circle.com";
const PUBLIC_KEY_URL = `${CIRCLE_API_BASE}/v1/w3s/config/entity/publicKey`;

const CORS_ALLOW_ORIGINS = [
  "https://casa-color-hub.lovable.app",
  "https://www.casa-color-hub.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowOrigin =
    origin && CORS_ALLOW_ORIGINS.some((o) => origin === o || origin.endsWith(".lovable.app"))
      ? origin
      : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-entity-secret",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

let cachedPublicKeyPem: string | null = null;

async function fetchPublicKeyPem(apiKey: string): Promise<string | null> {
  if (cachedPublicKeyPem) return cachedPublicKeyPem;
  const r = await fetch(PUBLIC_KEY_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const j = (await r.json()) as { data?: { publicKey?: string } };
  cachedPublicKeyPem = j?.data?.publicKey ?? null;
  return cachedPublicKeyPem;
}

function pemToSpkiBinary(pem: string): Uint8Array {
  const lines = pem
    .replace(/-----BEGIN PUBLIC KEY-----/i, "")
    .replace(/-----END PUBLIC KEY-----/i, "")
    .replace(/\s/g, "");
  const binaryString = atob(lines);
  const out = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    out[i] = binaryString.charCodeAt(i);
  }
  return out;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function hexToBytes(hex: string): Uint8Array | null {
  const trimmed = hex.replace(/\s/g, "");
  if (trimmed.length !== 64 || !/^[0-9a-fA-F]+$/.test(trimmed)) return null;
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(trimmed.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function getFreshCiphertext(
  apiKey: string,
  entitySecretHex: string
): Promise<string | null> {
  const pem = await fetchPublicKeyPem(apiKey);
  if (!pem) return null;
  const secretBytes = hexToBytes(entitySecretHex);
  if (!secretBytes) return null;
  const spkiBinary = pemToSpkiBinary(pem);
  const publicKey = await crypto.subtle.importKey(
    "spki",
    spkiBinary.buffer as ArrayBuffer,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    publicKey,
    secretBytes as unknown as ArrayBuffer
  );
  return arrayBufferToBase64(encrypted);
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const circleApiKey = Deno.env.get("CIRCLE_API_KEY");
  const circleEntitySecret = Deno.env.get("CIRCLE_ENTITY_SECRET");
  const circleEntitySecretHex = Deno.env.get("CIRCLE_ENTITY_SECRET_HEX");

  if (!circleApiKey) {
    return new Response(
      JSON.stringify({ error: "Circle API key not configured on server" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const marker = "circle-proxy";
    const pathIndex = pathname.indexOf(marker);
    const circlePath = pathIndex >= 0
      ? pathname.slice(pathIndex + marker.length) || "/"
      : url.searchParams.get("path") || "/v1/w3s/wallets";

    const targetPath = circlePath.startsWith("/") ? circlePath : `/${circlePath}`;
    const targetUrl = `${CIRCLE_API_BASE}${targetPath}${url.search || ""}`;

    const headers: HeadersInit = {
      Authorization: `Bearer ${circleApiKey}`,
      "Content-Type": "application/json",
    };
    if (circleEntitySecret && !circleEntitySecretHex) {
      (headers as Record<string, string>)["X-Entity-Secret"] = circleEntitySecret;
    }

    let body: string | undefined;
    if (req.method === "POST") {
      body = await req.text();
      const isDeveloperPath = targetPath.includes("/developer/");
      const needsCiphertext =
        isDeveloperPath &&
        body &&
        (circleEntitySecretHex || circleEntitySecret);

      if (needsCiphertext) {
        try {
          const data = JSON.parse(body);
          if (!data.entitySecretCiphertext) {
            if (circleEntitySecretHex) {
              const fresh = await getFreshCiphertext(
                circleApiKey,
                circleEntitySecretHex.trim()
              );
              if (fresh) {
                data.entitySecretCiphertext = fresh;
              } else {
                data.entitySecretCiphertext = circleEntitySecret ?? undefined;
              }
            } else {
              data.entitySecretCiphertext = circleEntitySecret;
            }
            body = JSON.stringify(data);
          }
        } catch {
        }
      }
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const data = await response.text();
    const contentType = response.headers.get("content-type") || "application/json";

    return new Response(data, {
      status: response.status,
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": contentType,
      },
    });
  } catch (err) {
    console.error("Circle proxy error:", err);
    const error = err as Error;
    return new Response(
      JSON.stringify({
        error: "Bad Gateway",
        message: "Error calling Circle API",
        details: error.message,
      }),
      { status: 502, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
