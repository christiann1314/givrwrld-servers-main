import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { clearTokens, getAccessToken, setTokens } from "../lib/auth";

export type AuthedUser = {
  id: number;
  email: string;
  display_name?: string | null;
};

type AuthContextType = {
  user: AuthedUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (email: string, password: string, display_name?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthedUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Bootstrap from existing token if available
  useEffect(() => {
    (async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          // No token -> not logged in
          setUser(null);
          return;
        }

        // Hydrate user from backend
        const me = await api.http<any>("/api/auth/me", { method: "GET" }).catch(async () => {
          // fallback if your backend uses a different path
          return await api.http<any>("/api/me", { method: "GET" });
        });

        // Support either { user: {...} } or a direct user object
        const u = me?.user ?? me;

        if (u?.id && u?.email) {
          setUser({
            id: u.id,
            email: u.email,
            display_name: u.display_name ?? null,
          });
        } else {
          clearTokens();
          setUser(null);
        }
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, password: string) {
    try {
      const resp = await api.login(email, password);

      if (!resp?.success || !resp?.token) {
        return { success: false, message: resp?.message || "Login failed" };
      }

      // ✅ STORE JWT
      setTokens(resp.token, resp.refreshToken);

      // ✅ SET USER (normalized shape)
      if (resp?.user) {
        setUser({
          id: resp.user.id,
          email: resp.user.email,
          display_name: resp.user.display_name ?? null,
        });
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || "Login failed" };
    }
  }

  async function signup(email: string, password: string, display_name?: string) {
    try {
      const resp = await api.register(email, password, display_name);

      if (!resp?.success || !resp?.token) {
        return { success: false, message: resp?.message || "Signup failed" };
      }

      // ✅ STORE JWT
      setTokens(resp.token, resp.refreshToken);

      // ✅ SET USER (normalized shape)
      if (resp?.user) {
        setUser({
          id: resp.user.id,
          email: resp.user.email,
          display_name: resp.user.display_name ?? null,
        });
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || "Signup failed" };
    }
  }

  function logout() {
    api.logout();
    clearTokens();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, signup, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
