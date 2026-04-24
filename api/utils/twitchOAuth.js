/**
 * Twitch OAuth2 (Authorization Code) — Helix user lookup + token storage.
 * Env: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET, TWITCH_OAUTH_REDIRECT_URI (must match Twitch dev console)
 * Optional: TWITCH_OAUTH_SCOPES (default user:read:email)
 */

export function twitchAuthorizeUrl({ state, scopes }) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const redirectUri = process.env.TWITCH_OAUTH_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    throw new Error('TWITCH_CLIENT_ID and TWITCH_OAUTH_REDIRECT_URI must be set');
  }
  const scopeStr = scopes || process.env.TWITCH_OAUTH_SCOPES || 'user:read:email';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopeStr,
    state,
  });
  return `https://id.twitch.tv/oauth2/authorize?${params.toString()}`;
}

export async function twitchExchangeCode(code) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;
  const redirectUri = process.env.TWITCH_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Twitch OAuth env incomplete');
  }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || 'Invalid Twitch token response');
  }
  if (!res.ok) {
    throw new Error(json.message || json.error || text || 'Twitch token exchange failed');
  }
  return json;
}

export async function twitchFetchMe(accessToken) {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const res = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Client-Id': clientId,
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.data?.[0]) {
    throw new Error(json.message || 'Failed to load Twitch user');
  }
  return json.data[0];
}
