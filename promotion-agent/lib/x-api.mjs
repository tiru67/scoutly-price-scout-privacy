import crypto from 'node:crypto';

const TWEET_URL = 'https://api.x.com/2/tweets';
const VERIFY_URL = 'https://api.x.com/2/users/me';
const PUBLIC_VERIFY_URL = 'https://api.x.com/2/users/by/username/X';

function percentEncode(value) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function hasBearerToken() {
  return Boolean(process.env.X_API_BEARER_TOKEN?.trim());
}

function hasOAuthCredentials() {
  return Boolean(
    process.env.X_API_KEY?.trim()
    && process.env.X_API_SECRET?.trim()
    && process.env.X_ACCESS_TOKEN?.trim()
    && process.env.X_ACCESS_TOKEN_SECRET?.trim()
  );
}

function oauth1Authorization({ method, url, body = {} }) {
  const consumerKey = process.env.X_API_KEY.trim();
  const consumerSecret = process.env.X_API_SECRET.trim();
  const token = process.env.X_ACCESS_TOKEN.trim();
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET.trim();

  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0'
  };

  const encodedPairs = Object.entries({ ...oauth })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`);

  const baseString = [
    method.toUpperCase(),
    percentEncode(url),
    percentEncode(encodedPairs.join('&'))
  ].join('&');

  const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret)}`;
  oauth.oauth_signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  const header = `OAuth ${Object.entries(oauth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ')}`;

  return header;
}

async function parseResponse(response) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }
  return { ok: response.ok, status: response.status, payload };
}

export function getXCredentialStatus() {
  return {
    bearerToken: hasBearerToken(),
    oauthUserContext: hasOAuthCredentials(),
    canPost: hasOAuthCredentials(),
    canReadAppOnly: hasBearerToken()
  };
}

export async function checkXConnection() {
  const credentials = getXCredentialStatus();

  if (!credentials.bearerToken && !credentials.oauthUserContext) {
    return {
      connected: false,
      credentials,
      error: 'No X credentials found. Add X_API_BEARER_TOKEN for read checks and OAuth user tokens for posting.'
    };
  }

  if (credentials.oauthUserContext) {
    const response = await fetch(VERIFY_URL, {
      headers: { Authorization: oauth1Authorization({ method: 'GET', url: VERIFY_URL }) }
    });
    const result = await parseResponse(response);
    if (!result.ok) {
      return {
        connected: false,
        credentials,
        mode: 'oauth_user_context',
        status: result.status,
        error: result.payload?.detail || result.payload?.title || 'OAuth user-context check failed',
        payload: result.payload
      };
    }

    return {
      connected: true,
      credentials,
      mode: 'oauth_user_context',
      user: result.payload?.data || null,
      note: 'OAuth user context verified. Live posting is attempted only during publish and requires Read and write app permissions with regenerated access tokens.'
    };
  }

  const response = await fetch(PUBLIC_VERIFY_URL, {
    headers: { Authorization: `Bearer ${process.env.X_API_BEARER_TOKEN.trim()}` }
  });
  const result = await parseResponse(response);
  if (result.ok) {
    return {
      connected: true,
      credentials,
      mode: 'bearer_app_only',
      note: 'Bearer token works for read checks, but posting requires OAuth user-context credentials.'
    };
  }

  const creditsDepleted = result.status === 402 || result.payload?.title === 'Payment Required';
  return {
    connected: creditsDepleted,
    credentials,
    mode: 'bearer_app_only',
    status: result.status,
    warning: creditsDepleted
      ? 'Bearer token is accepted, but the X API account has depleted credits. Add billing or upgrade the developer plan before API calls succeed.'
      : null,
    error: result.payload?.detail || result.payload?.title || 'Bearer token check failed',
    payload: result.payload
  };
}

export async function postTweet(text) {
  if (!hasOAuthCredentials()) {
    throw new Error(
      'X posting requires OAuth user-context credentials: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET. A bearer token alone cannot post tweets.'
    );
  }

  const response = await fetch(TWEET_URL, {
    method: 'POST',
    headers: {
      Authorization: oauth1Authorization({ method: 'POST', url: TWEET_URL }),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  const result = await parseResponse(response);
  if (!result.ok) {
    const message = result.payload?.detail
      || result.payload?.title
      || result.payload?.errors?.[0]?.message
      || `X API returned ${result.status}`;
    const hint = result.status === 403 && result.payload?.type?.includes('oauth1-permissions')
      ? ' Set app permissions to Read and write in the X Developer Portal, then regenerate Access Token and Secret.'
      : '';
    const error = new Error(`${message}${hint}`);
    error.status = result.status;
    error.payload = result.payload;
    throw error;
  }

  return {
    tweetId: result.payload?.data?.id || null,
    text: result.payload?.data?.text || text,
    payload: result.payload
  };
}
