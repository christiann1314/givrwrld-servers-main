// src/lib/auth.ts
// Single source of truth for token storage + refresh

const ACCESS_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken?: string | null, refreshToken?: string | null) {
  try {
    if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else window.localStorage.removeItem(ACCESS_TOKEN_KEY);

    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export function clearTokens() {
  setTokens(null, null);
}

/**
 * Refresh access token using refreshToken.
 * Expects backend: POST /api/auth/refresh -> { success, token, refreshToken? }
 */
export async function refreshAccessToken(apiBase = ""): Promise<{ token: string; refreshToken?: string } | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  const res = await fetch(`${apiBase}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ refreshToken: rt }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as any;
  const token = data?.token;
  if (!token) return null;

  const newRefresh = data?.refreshToken;
  return { token, refreshToken: newRefresh };
}
