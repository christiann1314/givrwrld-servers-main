// src/lib/api.ts
import { clearTokens, getAccessToken, refreshAccessToken, setTokens } from "./auth";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function getApiBase(): string {
  // Prefer VITE_API_URL, fallback to VITE_API_BASE_URL; otherwise same-origin.
  const env = (import.meta as any)?.env;
  const v = env?.VITE_API_URL || env?.VITE_API_BASE_URL;
  const normalized = typeof v === "string" ? v.replace(/\/$/, "") : "";
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isLocalFrontendOrigin =
    /^https?:\/\/(localhost|127\.0\.0\.1):8080$/i.test(browserOrigin);
  const pointsToLocalFrontend =
    /^(https?:\/\/)(localhost|127\.0\.0\.1):8080(\/|$)/i.test(normalized);
  const isRelativeApiBase = normalized.startsWith("/");

  // Hard guard: when app is served from local frontend port, always talk to local API.
  // This prevents accidental same-origin `/api/*` calls hitting Vite and returning 404.
  if (isLocalFrontendOrigin && (!normalized || pointsToLocalFrontend || isRelativeApiBase)) {
    return "http://localhost:3001";
  }

  if (env?.DEV) {
    // Guard against misconfigured local env that points API to the Vite dev server.
    if (
      !normalized ||
      /^(https?:\/\/)(localhost|127\.0\.0\.1):8080(\/|$)/i.test(normalized)
    ) {
      return "http://localhost:3001";
    }
  }

  return normalized;
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
  const apiBase = getApiBase();
  const url = path.startsWith("http") ? path : `${apiBase}${path}`;

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
        const msg = await safeErrorMessage(retryRes);
        throw new Error(msg);
      }
      return (await retryRes.json()) as T;
    }

    // refresh failed -> clear tokens
    clearTokens();
    const msg = await safeErrorMessage(res);
    throw new Error(msg || "Unauthorized");
  }

  if (!res.ok) {
    const msg = await safeErrorMessage(res);
    throw new Error(msg);
  }

  return (await res.json()) as T;
}

async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.message || data?.error || `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
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
