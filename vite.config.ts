import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import crypto from "node:crypto";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const homeAssistantHost = env.VITE_HOME_ASSISTANT_HOST || 'https://synaptical-phraseologically-randa.ngrok-free.dev';
  const homeAssistantToken = env.VITE_HOME_ASSISTANT_TOKEN;

  const circleApiKey = env.CIRCLE_API_KEY || env.VITE_CIRCLE_API_KEY;
  const circleEntitySecret = env.CIRCLE_ENTITY_SECRET || env.VITE_CIRCLE_ENTITY_SECRET;
  const circleEntitySecretHex = env.CIRCLE_ENTITY_SECRET_HEX || env.VITE_CIRCLE_ENTITY_SECRET_HEX;

  if (!circleApiKey) {
    console.warn(
      '\n⚠️  Circle proxy: CIRCLE_API_KEY o VITE_CIRCLE_API_KEY no definida en .env → peticiones a /api/circle devolverán 401.\n'
    );
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api/circle': {
          target: 'https://api.circle.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/circle/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (circleApiKey) {
                proxyReq.setHeader('Authorization', `Bearer ${circleApiKey}`);
              }
              if (circleEntitySecret && !circleEntitySecretHex) {
                proxyReq.setHeader('X-Entity-Secret', circleEntitySecret);
              }
              proxyReq.setHeader('Content-Type', 'application/json');
            });
          },
        },
        '/api/home-assistant': {
          target: homeAssistantHost,
          changeOrigin: true,
          secure: false,
          timeout: 30000,
          ws: false,
          rewrite: (path) => path.replace(/^\/api\/home-assistant/, '/api'),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              if (homeAssistantToken) {
                const authHeader = `Bearer ${homeAssistantToken}`;
                proxyReq.setHeader('Authorization', authHeader);
              }
              proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
              proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
            });
            
            proxy.on('proxyRes', (proxyRes, req, res) => {
              if (!proxyRes.headers['access-control-allow-origin']) {
                proxyRes.headers['access-control-allow-origin'] = '*';
              }
              if (!proxyRes.headers['ngrok-skip-browser-warning']) {
                proxyRes.headers['ngrok-skip-browser-warning'] = 'true';
              }
            });
            
            proxy.on('error', (err, req, res) => {
              console.error('[Proxy Error]', err.message);
              const isNgrokError = err.message.includes('TLS') || 
                                   err.message.includes('socket disconnected') ||
                                   err.message.includes('ECONNREFUSED') ||
                                   err.message.includes('ENOTFOUND') ||
                                   err.message.includes('getaddrinfo');
              
              const isTimeoutError = err.message.includes('timeout') || 
                                     err.message.includes('ETIMEDOUT') ||
                                     (err as any).code === 'ETIMEDOUT';
              
              if (res && !res.headersSent) {
                const statusCode = isTimeoutError ? 504 : 502;
                const errorType = isTimeoutError ? 'Gateway Timeout' : 'Bad Gateway';
                const errorMessage = isTimeoutError 
                  ? 'Timeout al conectar con Home Assistant'
                  : 'Error de conexión con Home Assistant a través del proxy';
                
                res.writeHead(statusCode, {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                });
                res.end(JSON.stringify({
                  error: errorType,
                  message: errorMessage,
                  details: isNgrokError 
                    ? `Túnel de ngrok no disponible. Verifica que ngrok esté activo en: ${homeAssistantHost}`
                    : err.message,
                  host: homeAssistantHost,
                }));
              }
            });
          },
        },
      },
    },
    plugins: [
      react(),
      {
        name: 'circle-create-wallet-set',
        configureServer(server) {
          let cachedPublicKeyPem: string | null = null;
          async function getFreshCiphertext(): Promise<string> {
            const hex = (circleEntitySecretHex || '').trim();
            if (hex.length !== 64 || !circleApiKey) return '';
            if (!cachedPublicKeyPem) {
              const r = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
                headers: { Authorization: `Bearer ${circleApiKey}` },
              });
              const j = (await r.json()) as { data?: { publicKey?: string } };
              cachedPublicKeyPem = j?.data?.publicKey || null;
            }
            if (!cachedPublicKeyPem) return '';
            const entitySecretBytes = Buffer.from(hex, 'hex');
            if (entitySecretBytes.length !== 32) return '';
            const encrypted = crypto.publicEncrypt(
              {
                key: cachedPublicKeyPem,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: 'sha256',
              },
              entitySecretBytes
            );
            return encrypted.toString('base64');
          }

          return () => {
            const handler = (req: any, res: any, next: () => void) => {
              const isPostCircleDeveloper =
                req.method === 'POST' &&
                req.url?.includes('/api/circle') &&
                req.url?.includes('developer/');
              if (!isPostCircleDeveloper) {
                return next();
              }
              let body = '';
              req.on('data', (chunk: Buffer | string) => { body += typeof chunk === 'string' ? chunk : chunk.toString(); });
              req.on('end', async () => {
                try {
                  if (!circleApiKey) {
                    res.statusCode = 401;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      error: 'Circle API key not set',
                      message: 'Añade CIRCLE_API_KEY o VITE_CIRCLE_API_KEY en .env y reinicia "npm run dev".',
                    }));
                    return;
                  }
                  const hexTrimmed = (circleEntitySecretHex || '').trim();
                  const validHex = /^[0-9a-fA-F]{64}$/.test(hexTrimmed);
                  if (!validHex) {
                    const configMessage = hexTrimmed.length === 0
                      ? 'Añade CIRCLE_ENTITY_SECRET_HEX en .env (64 caracteres hexadecimales 0-9, a-f). Reinicia "npm run dev" después de guardar.'
                      : `CIRCLE_ENTITY_SECRET_HEX debe ser exactamente 64 caracteres hexadecimales (0-9, a-f). Tienes ${hexTrimmed.length} caracteres${hexTrimmed.length === 64 ? ' pero hay caracteres no válidos' : ''}.`;
                    if (process.env.NODE_ENV !== 'production') {
                      console.warn('[Circle proxy] 400:', configMessage);
                    }
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                      code: 'PROXY_CONFIG',
                      error: 'Entity secret hex required',
                      message: configMessage,
                    }));
                    return;
                  }
                  const data = JSON.parse(body || '{}');
                  const circlePath = req.url.replace(/^[^?]*\/api\/circle/, '') || '/v1/w3s/developer/walletSets';
                  const isCreateWalletSet = circlePath.replace(/\?.*/, '') === '/v1/w3s/developer/walletSets';

                  if (isCreateWalletSet) {
                    const client = initiateDeveloperControlledWalletsClient({
                      apiKey: circleApiKey!.trim(),
                      entitySecret: hexTrimmed,
                    });
                    try {
                      const walletSetResponse = await client.createWalletSet({
                        name: data.name || 'Casa Color',
                      });
                      res.statusCode = 201;
                      res.setHeader('Content-Type', 'application/json');
                      const raw = walletSetResponse?.data as { walletSet?: { id?: string; name?: string; createdAt?: string; updatedAt?: string } } | undefined;
                      const walletSet = raw && typeof raw === 'object' && raw.walletSet ? raw.walletSet : undefined;
                      const safe = walletSet
                        ? { data: { walletSet: { id: walletSet.id, name: walletSet.name, createdAt: walletSet.createdAt, updatedAt: walletSet.updatedAt } } }
                        : { data: raw && typeof raw === 'object' && 'walletSet' in raw ? { walletSet: null } : null };
                      res.end(JSON.stringify(safe));
                    } catch (err: unknown) {
                      const e = err as { response?: { data?: { message?: unknown; code?: number }; status?: number }; message?: unknown };
                      const status = Number(e.response?.status) || 502;
                      const errData = e.response?.data;
                      const rawMessage = errData?.message ?? e.message;
                      const message = typeof rawMessage === 'string' ? rawMessage : 'Error al crear Wallet Set';
                      const code = typeof errData?.code === 'number' ? errData.code : status;
                      if (process.env.NODE_ENV !== 'production') {
                        console.error('[Circle proxy] createWalletSet error:', status, message);
                      }
                      res.statusCode = status;
                      res.setHeader('Content-Type', 'application/json');
                      const body = { code, error: 'Circle API error', message };
                      try {
                        res.end(JSON.stringify(body));
                      } catch {
                        res.end(JSON.stringify({ code: 502, error: 'Circle API error', message: 'Error al crear Wallet Set' }));
                      }
                    }
                    return;
                  }

                  data.entitySecretCiphertext = await getFreshCiphertext();
                  if (!data.entitySecretCiphertext) {
                    res.statusCode = 502;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'No se pudo generar entity secret ciphertext' }));
                    return;
                  }
                  const targetUrl = `https://api.circle.com${circlePath.startsWith('/') ? circlePath : '/' + circlePath}${req.url?.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`;
                  const newBody = JSON.stringify(data);
                  fetch(targetUrl, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${circleApiKey}`,
                      'Content-Type': 'application/json',
                    },
                    body: newBody,
                  })
                    .then((r) => {
                      res.statusCode = r.status;
                      res.setHeader('Content-Type', 'application/json');
                      return r.text();
                    })
                    .then((text) => {
                      if (res.statusCode === 401 || res.statusCode === 400) {
                        let hint = '';
                        try {
                          const parsed = JSON.parse(text);
                          hint = parsed?.message || parsed?.error || text;
                        } catch {
                          hint = text;
                        }
                        res.end(JSON.stringify({
                          error: 'Circle API error',
                          message: hint,
                          hint: 'Verifica CIRCLE_API_KEY y CIRCLE_ENTITY_SECRET_HEX (hex 64 caracteres) en .env. Reinicia "npm run dev".',
                        }));
                      } else {
                        res.end(text);
                      }
                    })
                    .catch((err: Error) => {
                      res.statusCode = 502;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ error: err.message }));
                    });
                } catch {
                  next();
                }
              });
            };
            (server.middlewares as any).stack.unshift({ route: '', handle: handler });
          };
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
