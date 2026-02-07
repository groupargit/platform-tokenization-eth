import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const HOME_ASSISTANT_HOST = Deno.env.get('HOME_ASSISTANT_HOST') || 'https://synaptical-phraseologically-randa.ngrok-free.dev';
const HOME_ASSISTANT_TOKEN = Deno.env.get('HOME_ASSISTANT_TOKEN');

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    
    if (!path) {
      return new Response(
        JSON.stringify({ error: 'Missing path parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!HOME_ASSISTANT_TOKEN) {
      return new Response(
        JSON.stringify({ error: 'Home Assistant token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetUrl = `${HOME_ASSISTANT_HOST}/api${path}`;
    
    const headers: HeadersInit = {
      'Authorization': `Bearer ${HOME_ASSISTANT_TOKEN}`,
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      'User-Agent': 'Mozilla/5.0',
    };

    let body: string | undefined;
    if (req.method === 'POST') {
      body = await req.text();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return new Response(
        JSON.stringify({ 
          error: 'Tunnel unavailable',
          message: 'El túnel de ngrok devolvió una página HTML. Verifica que esté activo.' 
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { 
        status: response.status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Proxy error:', err);
    
    const error = err as Error;
    const isTimeout = error.name === 'AbortError';
    const statusCode = isTimeout ? 504 : 502;
    const message = isTimeout 
      ? 'Timeout al conectar con Home Assistant' 
      : 'Error de conexión con Home Assistant';

    return new Response(
      JSON.stringify({ 
        error: isTimeout ? 'Gateway Timeout' : 'Bad Gateway',
        message,
        details: error.message || 'Unknown error'
      }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
