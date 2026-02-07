#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

async function main() {
  const env = loadEnv();
  const apiKey = process.env.CIRCLE_API_KEY || process.env.VITE_CIRCLE_API_KEY || env.CIRCLE_API_KEY || env.VITE_CIRCLE_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    console.error('Error: Necesitas CIRCLE_API_KEY o VITE_CIRCLE_API_KEY en .env o en el entorno.');
    console.error('Ejemplo: CIRCLE_API_KEY=tu-api-key node scripts/generate-entity-secret-ciphertext.cjs');
    process.exit(1);
  }

  console.log('Obteniendo clave pública de Circle...');
  const res = await fetch('https://api.circle.com/v1/w3s/config/entity/publicKey', {
    headers: { Authorization: `Bearer ${apiKey.trim()}` },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Error al obtener la clave pública:', res.status, text);
    process.exit(1);
  }

  const json = await res.json();
  const publicKeyPem = json?.data?.publicKey;
  if (!publicKeyPem) {
    console.error('Error: la respuesta de Circle no incluye data.publicKey');
    process.exit(1);
  }

  const entitySecretBytes = crypto.randomBytes(32);
  const hexEncodedEntitySecret = entitySecretBytes.toString('hex');

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    entitySecretBytes
  );
  const entitySecretCiphertext = encrypted.toString('base64');

  console.log('\n--- Entity Secret (hex) - GUÁRDALO EN LUGAR SEGURO; CIRCLE NO LO GUARDA ---');
  console.log(hexEncodedEntitySecret);
  console.log('\n--- Entity Secret Ciphertext (base64) - REGISTRA ESTE VALOR EN CIRCLE CONSOLE ---');
  console.log(entitySecretCiphertext);
  console.log('\n--- Pasos siguientes ---');
  console.log('1. Ve a https://console.circle.com/ → Wallets → Dev-Controlled → Entity Secret');
  console.log('2. Pega el "Entity Secret Ciphertext" de arriba en el campo y pulsa Register');
  console.log('3. En .env añade UNA de estas opciones:');
  console.log('   - CIRCLE_ENTITY_SECRET_HEX=' + hexEncodedEntitySecret);
  console.log('     (recomendado: el proxy genera un ciphertext nuevo en cada petición; evita error 156013)');
  console.log('   - O CIRCLE_ENTITY_SECRET=<ciphertext completo> si prefieres un solo ciphertext (puede fallar si Circle exige uno nuevo por petición)');
  console.log('4. Guarda el Entity Secret (hex) y el archivo de recuperación en un lugar seguro.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
