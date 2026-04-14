// src/lib/api.ts
import { clearTokens, getAccessToken, refreshAccessToken, setTokens } from "./auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Common deploy typo: "givrwld" instead of "givrwrld" — wrong host → 405 / broken WebSockets. */
function fixGivrwrldHostnameTypo(url: string): string {
  return url.replace(/givrwldservers\.com/gi, "givrwrldservers.com");
}

/** Fetch paths in this app are `/api/...`; base URL must be origin only (no trailing `/api`). */
function finalizeApiBaseUrl(url: string): string {
  const t = fixGivrwrldHostnameTypo(url).replace(/\/+$/, "");
  if (!t || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(t)) {
    return t;
  }
  return /\/api$/i.test(t) ? t.replace(/\/api$/i, "") : t;
}

export function getApiBase(): string {
  // Prefer VITE_API_URL, fallback to VITE_API_BASE_URL; otherwise same-origin.
  const env = (import.meta as any)?.env;
  const v = env?.VITE_API_URL || env?.VITE_API_BASE_URL;
  let normalized =
    typeof v === "string" ? fixGivrwrldHostnameTypo(v.replace(/\/$/, "")) : "";
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalFrontendOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1):8080$/i.test(browserOrigin);
  const pointsToLocalFrontend =
    /^(https?:\/\/)(localhost|127\.0\.0\.1):8080(\/|$)/i.test(normalized);
  const isRelativeApiBase = normalized.startsWith("/");

  // Hard guard: when app is served from local frontend port, always talk to local API.
  if (isLocalFrontendOrigin && (!normalized || pointsToLocalFrontend || isRelativeApiBase)) {
    return "http://localhost:3001";
  }

  if (env?.DEV) {
    if (
      !normalized ||
      /^(https?:\/\/)(localhost|127\.0\.0\.1):8080(\/|$)/i.test(normalized)
    ) {
      return "http://localhost:3001";
    }
  }

  // Production: JSON API must not use the static www/apex origin (POST often returns 405 without proxy).
  if (typeof window !== "undefined") {
    const host = fixGivrwrldHostnameTypo(window.location.hostname || "");
    if (/^(www\.)?givrwrldservers\.com$/i.test(host)) {
      const scheme = window.location.protocol === "https:" ? "https" : "http";
      const apiSubdomainBase = `${scheme}://api.givrwrldservers.com`;
      const isWwwOrApexApi = /^https?:\/\/(www\.)?givrwrldservers\.com$/i.test(normalized);
      if (!normalized || isWwwOrApexApi || normalized === browserOrigin) {
        return apiSubdomainBase;
      }
    }
  }

  return finalizeApiBaseUrl(normalized);
}

/**
 * Join API origin with a path. If env was mis-set to `.../api` and paths are `/api/...`,
 * avoid `.../api/api/...` (wrong route → often 404/405 via proxies).
 */
function resolveApiUrl(path: string): { url: string; apiBase: string } {
  const apiBase = getApiBase().replace(/\/+$/, "");
  if (path.startsWith("http")) {
    return { url: path, apiBase };
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  if (p.startsWith("/api/") && /\/api$/i.test(apiBase)) {
    return { url: `${apiBase}${p.slice(4)}`, apiBase };
  }
  return { url: `${apiBase}${p}`, apiBase };
}

async function http<T>(
  path: string,
  options: {
    method?: HttpMethod;
    headers?: Record<string, string>;
    body?: any;
    retryOnAuthFail?: boolean;
  } = {}
): Promise<T> {
  const { url, apiBase } = resolveApiUrl(path);

  const method = options.method || "GET";
  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // If body is present and no content-type set, assume JSON
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers["Content-Type"] && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Attach bearer token (if present)
  const token = getAccessToken();
  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    credentials: "include",
    body: hasBody ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
  });

  // If unauthorized, attempt refresh once and retry request once
  const retryEnabled = options.retryOnAuthFail !== false;
  if (res.status === 401 && retryEnabled) {
    const refreshed = await refreshAccessToken(apiBase);
    if (refreshed?.token) {
      setTokens(refreshed.token, refreshed.refreshToken ?? undefined);

      const retryHeaders: Record<string, string> = { ...headers, Authorization: `Bearer ${refreshed.token}` };

      const retryRes = await fetch(url, {
        method,
        headers: retryHeaders,
        credentials: "include",
        body: hasBody ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
      });

      if (!retryRes.ok) {
        throw await buildHttpError(retryRes);
      }
      return parseSuccessJsonBody<T>(retryRes);
    }

    // refresh failed -> clear tokens
    clearTokens();
    throw await buildHttpError(res);
  }

  if (!res.ok) {
    throw await buildHttpError(res);
  }

  return parseSuccessJsonBody<T>(res);
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.message || data?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

async function parseSuccessJsonBody<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text || !text.trim()) {
    return null as T;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    const error = new Error("Invalid JSON response") as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
}

async function buildHttpError(res: Response): Promise<Error & { status?: number; fields?: Record<string, string> }> {
  try {
    const data = await res.json();
    const error = new Error(data?.message || data?.error || `Request failed (${res.status})`) as Error & {
      status?: number;
      fields?: Record<string, string>;
    };
    error.status = res.status;
    if (data?.fields && typeof data.fields === "object") {
      error.fields = data.fields;
    }
    return error;
  } catch {
    const error = new Error(`Request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    return error;
  }
}

function normalizeAuthResponse(raw: any) {
  // backend: { success:true, user:{...}, token:"...", refreshToken:"..." }
  if (raw?.success && raw?.token && raw?.user) return raw;
  // alternative shapes
  if (raw?.token && raw?.user) return { success: true, ...raw };
  return raw;
}

export const api = {
  // Generic
  http,

  // Auth
  async register(email: string, password: string, display_name?: string) {
    const raw = await http<any>("/api/auth/signup", {
      method: "POST",
      body: { email, password, display_name },
      retryOnAuthFail: false,
    });
    const norm = normalizeAuthResponse(raw);
    if (norm?.token) setTokens(norm.token, norm.refreshToken);
    return {
      success: !!norm?.success,
      user: norm?.user,
      token: norm?.token,
      refreshToken: norm?.refreshToken,
      message: norm?.message,
      pendingVerification: !!norm?.pendingVerification,
    };
  },

  async login(email: string, password: string) {
    const raw = await http<any>("/api/auth/login", {
      method: "POST",
      body: { email, password },
      retryOnAuthFail: false,
    });
    const norm = normalizeAuthResponse(raw);
    if (norm?.token) setTokens(norm.token, norm.refreshToken);
    return { success: !!norm?.success, user: norm?.user, token: norm?.token, refreshToken: norm?.refreshToken, message: norm?.message };
  },

  logout() {
    // Optional: you can also POST /api/auth/logout but local clear is the hard requirement
    clearTokens();
  },
 
   // Aliases for useAuth compatibility
   async signUp(email: string, password: string, firstName?: string, lastName?: string) {
     const raw = await http<any>("/api/auth/signup", {
       method: "POST",
       body: { email, password, firstName, lastName },
       retryOnAuthFail: false,
     });
     return {
       success: !!raw?.success,
       data: raw?.token ? { user: raw?.user, token: raw?.token } : undefined,
       pendingVerification: !!raw?.pendingVerification,
       message: raw?.message,
       error: raw?.success ? undefined : raw?.message,
     };
   },
 
   async signIn(email: string, password: string) {
     const result = await this.login(email, password);
     return { success: result.success, data: result.success ? { user: result.user, token: result.token } : undefined, error: result.message };
   },
 
   async signOut() {
     this.logout();
     return { success: true };
   },
 
   async getCurrentUser() {
     try {
       const result = await http<any>("/api/auth/me", { method: "GET" });
       return { success: true, data: { user: result.user || result } };
     } catch {
       return { success: false, data: null };
     }
   },

  // Data
  async getOrders() {
    return await http<any>("/api/orders", { method: "GET" });
  },

  async getPterodactylCredentials() {
    return await http<any>("/api/auth/pterodactyl-credentials", { method: "GET" });
  },

  async resetPterodactylCredentials() {
    return await http<any>("/api/auth/pterodactyl-credentials/reset", {
      method: "POST",
      body: {},
    });
  },

  async verifyEmail(token: string) {
    return await http<any>("/api/auth/verify-email", {
      method: "POST",
      body: { token },
      retryOnAuthFail: false,
    });
  },

  async resendVerification(email: string) {
    return await http<any>("/api/auth/resend-verification", {
      method: "POST",
      body: { email },
      retryOnAuthFail: false,
    });
  },

  async finalizePayPalOrder(orderId: string) {
    return await http<any>("/api/paypal/finalize-order", {
      method: "POST",
      body: { order_id: orderId },
      retryOnAuthFail: false,
    });
  },

  async getServers() {
    return await http<any>("/api/servers", { method: "GET" });
  },

  async getServerStats(orderId: string) {
    return await http<any>(`/api/servers/stats?order_id=${encodeURIComponent(orderId)}`, { method: "GET" });
  },

  async getServer(orderId: string) {
    return await http<any>(`/api/servers/${encodeURIComponent(orderId)}`, { method: "GET" });
  },

  async getServerResources(orderId: string) {
    return await http<any>(`/api/servers/${encodeURIComponent(orderId)}/resources`, { method: "GET" });
  },

  async getServerPublicPage(orderId: string) {
    return await http<any>(`/api/servers/${encodeURIComponent(orderId)}/public-page`, { method: "GET" });
  },

  async updateServerPublicPage(orderId: string, data: any) {
    return await http<any>(`/api/servers/${encodeURIComponent(orderId)}/public-page`, {
      method: "PUT",
      body: data,
    });
  },

  async checkPublicSlugAvailability(orderId: string, slug: string) {
    return await http<any>(
      `/api/servers/public-page/slug-availability?order_id=${encodeURIComponent(orderId)}&slug=${encodeURIComponent(slug)}`,
      { method: "GET" }
    );
  },

  async getPublicServerPage(slug: string) {
    return await http<any>(`/api/public/server/${encodeURIComponent(slug)}`, {
      method: "GET",
      retryOnAuthFail: false,
    });
  },

  async getPublicStreamers() {
    return await http<{ streamers: any[] }>("/api/public/streamers", {
      method: "GET",
      retryOnAuthFail: false,
    });
  },

  async syncPanelUser() {
    return await http<{ pterodactyl_user_id: string; panel_username: string; last_synced_at?: string }>("/api/auth/panel-sync-user", {
      method: "POST",
      body: {},
    });
  },

   async getPlans() {
     return await http<any>("/api/plans", { method: "GET" });
   },

  async getPlanCatalog() {
    return await http<any>("/api/plans/catalog", { method: "GET" });
  },
 
   async createCheckoutSession(data: any) {
     return await http<any>("/api/checkout/create-session", {
       method: "POST",
       body: data
     });
   },

  // Admin (requires admin role)
  async getAdminTickets() {
    return await http<{ success: boolean; tickets: any[] }>("/api/admin/tickets", { method: "GET" });
  },
  async getAdminTicket(id: string) {
    return await http<{ success: boolean; ticket: any; messages: any[] }>(`/api/admin/tickets/${id}`, { method: "GET" });
  },
  async postAdminTicketReply(id: string, message: string) {
    return await http<{ success: boolean }>(`/api/admin/tickets/${id}/messages`, {
      method: "POST",
      body: { message },
    });
  },
  async patchAdminTicket(id: string, status: string) {
    return await http<{ success: boolean; status: string }>(`/api/admin/tickets/${id}`, {
      method: "PATCH",
      body: { status },
    });
  },
  async getAdminMetrics() {
    return await http<{ success: boolean; metrics: any }>("/api/admin/metrics", { method: "GET" });
  },
};

export default api;
