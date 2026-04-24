/**
 * Kick OAuth 2.1 — Authorization Code + PKCE (id.kick.com).
 * Env: KICK_CLIENT_ID, KICK_CLIENT_SECRET, KICK_OAUTH_REDIRECT_URI
 * Optional: KICK_OAUTH_SCOPES (default user:read)
 */
import crypto from 'crypto';

const AUTH_BASE = 'https://id.kick.com';
const API_BASE = 'https://api.kick.com';

function base64Url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function kickGeneratePkce() {
  const codeVerifier = base64Url(crypto.randomBytes(32));
  const codeChallenge = base64Url(crypto.createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function kickAuthorizeUrl({ state, codeChallenge, scopes }) {
  const clientId = process.env.KICK_CLIENT_ID;
  const redirectUri = process.env.KICK_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('KICK_CLIENT_ID and KICK_OAUTH_REDIRECT_URI must be set');
  }
  const scopeStr = scopes || process.env.KICK_OAUTH_SCOPES || 'user:read';
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    scope: scopeStr,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_BASE}/oauth/authorize?${params.toString()}`;
}

export async function kickExchangeCode(code, codeVerifier) {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  const redirectUri = process.env.KICK_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Kick OAuth env incomplete');
  }
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid Kick token response');
  }
  if (!res.ok) {
    throw new Error(json.error_description || json.message || json.error || text || 'Kick token exchange failed');
  }
  return json.data || json;
}

export async function kickRefreshToken(refreshToken) {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Kick OAuth env incomplete');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });
  const res = await fetch(`${AUTH_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid Kick refresh response');
  }
  if (!res.ok) {
    throw new Error(json.error_description || json.message || json.error || text || 'Kick refresh failed');
  }
  return json.data || json;
}

export async function kickFetchMe(accessToken) {
  const res = await fetch(`${API_BASE}/public/v1/users`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Failed to load Kick user');
  const u = json.data?.[0];
  if (!u) throw new Error('Kick user payload empty');
  return u;
}
