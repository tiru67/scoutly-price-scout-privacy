import { createHmac, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

async function loadLocalEnv() {
  try {
    const text = await readFile(resolve(root, '.env.local'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* environment variables may already be supplied by the runner */ }
}

const encode = value => encodeURIComponent(String(value)).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

function credentials() {
  const names = ['X_API_KEY', 'X_API_KEY_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'];
  const missing = names.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`Missing local X credentials: ${missing.join(', ')}`);
  return { consumerKey: process.env.X_API_KEY, consumerSecret: process.env.X_API_KEY_SECRET, token: process.env.X_ACCESS_TOKEN, tokenSecret: process.env.X_ACCESS_TOKEN_SECRET };
}

function oauthHeader(method, url, creds) {
  const parsed = new URL(url);
  const oauth = { oauth_consumer_key: creds.consumerKey, oauth_nonce: randomBytes(16).toString('hex'), oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: Math.floor(Date.now() / 1000), oauth_token: creds.token, oauth_version: '1.0' };
  const pairs = [...parsed.searchParams.entries(), ...Object.entries(oauth)].sort(([a, av], [b, bv]) => {
    const left = `${encode(a)}=${encode(av)}`;
    const right = `${encode(b)}=${encode(bv)}`;
    return left < right ? -1 : left > right ? 1 : 0;
  });
  const normalized = pairs.map(([key, value]) => `${encode(key)}=${encode(value)}`).join('&');
  const base = [method.toUpperCase(), encode(`${parsed.origin}${parsed.pathname}`), encode(normalized)].join('&');
  const signingKey = `${encode(creds.consumerSecret)}&${encode(creds.tokenSecret)}`;
  const signature = createHmac('sha1', signingKey).update(base).digest('base64');
  oauth.oauth_signature = signature;
  return `OAuth ${Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${encode(key)}="${encode(value)}"`).join(', ')}`;
}

export async function getCurrentUser() {
  await loadLocalEnv();
  const creds = credentials();
  const url = 'https://api.x.com/1.1/account/verify_credentials.json';
  const response = await fetch(url, { headers: { Authorization: oauthHeader('GET', url, creds) } });
  const body = await response.text();
  if (!response.ok) throw new Error(`X identity check failed (${response.status}): ${body.slice(0, 300)}`);
  const user = JSON.parse(body);
  return { id: user.id_str, name: user.name, username: user.screen_name };
}

export async function postTweet(text) {
  await loadLocalEnv();
  const creds = credentials();
  if (!text || text.length > 280) throw new Error('X post must contain between 1 and 280 characters.');
  const url = 'https://api.x.com/2/tweets';
  const response = await fetch(url, { method: 'POST', headers: { Authorization: oauthHeader('POST', url, creds), 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  const body = await response.text();
  if (!response.ok) throw new Error(`X post failed (${response.status}): ${body.slice(0, 300)}`);
  return JSON.parse(body).data;
}
