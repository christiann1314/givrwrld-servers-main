/**
 * TikTok Login Kit — OAuth2 authorization code (open.tiktokapis.com).
 * Env: TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_OAUTH_REDIRECT_URI (must match TikTok app config)
 * Optional: TIKTOK_OAUTH_SCOPES (default user.info.basic)
 */

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';

export function tiktokAuthorizeUrl({ state, scopes }) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = process.env.TIKTOK_OAUTH_REDIRECT_URI;
  if (!clientKey || !redirectUri) {
    throw new Error('TIKTOK_CLIENT_KEY and TIKTOK_OAUTH_REDIRECT_URI must be set');
  }
  const scopeStr = scopes || process.env.TIKTOK_OAUTH_SCOPES || 'user.info.basic';
  const params = new URLSearchParams({
    client_key: clientKey,
    response_type: 'code',
    scope: scopeStr,
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

async function postForm(url, fields) {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid TikTok response');
  }
  if (!res.ok) {
    const err = json.error || json.message || json.error_description || text;
    throw new Error(typeof err === 'string' ? err : JSON.stringify(err));
  }
  return json;
}

export async function tiktokExchangeCode(code) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  const redirectUri = process.env.TIKTOK_OAUTH_REDIRECT_URI;
  if (!clientKey || !clientSecret || !redirectUri) {
    throw new Error('TikTok OAuth env incomplete');
  }
  const raw = await postForm(TOKEN_URL, {
    client_key: clientKey,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const d = raw.data || raw;
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_in: d.expires_in,
    open_id: d.open_id,
    _raw: raw,
  };
}

export async function tiktokRefreshToken(refreshToken) {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) throw new Error('TikTok OAuth env incomplete');
  const raw = await postForm(TOKEN_URL, {
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  const d = raw.data || raw;
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expires_in: d.expires_in,
    _raw: raw,
  };
}

export async function tiktokFetchUser(accessToken) {
  const fields = encodeURIComponent('open_id,union_id,display_name,avatar_url');
  const res = await fetch(`https://open.tiktokapis.com/v2/user/info/?fields=${fields}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json.error?.message || json.message || 'TikTok user info failed';
    throw new Error(err);
  }
  const u = json.data?.user || json.data || json.user;
  if (!u?.open_id) throw new Error('TikTok user payload missing open_id');
  return u;
}
