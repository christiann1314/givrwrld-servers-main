/**
 * Google OAuth2 (YouTube identity) — Authorization Code + refresh tokens.
 * Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI
 * Optional: GOOGLE_OAUTH_SCOPES (defaults include YouTube read + profile)
 */

const DEFAULT_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/youtube.readonly',
].join(' ');

export function googleAuthorizeUrl({ state, scopes }) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_OAUTH_REDIRECT_URI must be set');
  }
  const scopeStr = scopes || process.env.GOOGLE_OAUTH_SCOPES || DEFAULT_SCOPES;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopeStr,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function googleExchangeCode(code) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth env incomplete');
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid Google token response');
  }
  if (!res.ok) {
    throw new Error(json.error_description || json.error || text || 'Google token exchange failed');
  }
  return json;
}

export async function googleRefreshToken(refreshToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth env incomplete');
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid Google refresh response');
  }
  if (!res.ok) {
    throw new Error(json.error_description || json.error || text || 'Google refresh failed');
  }
  return json;
}

export async function googleFetchUserinfo(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error?.message || json.error || 'Failed to load Google userinfo');
  return json;
}

/** Primary YouTube channel id for this user (optional; falls back to sub). */
export async function youtubeMineChannelId(accessToken) {
  const url =
    'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  const id = json.items?.[0]?.id;
  return id ? String(id) : null;
}
