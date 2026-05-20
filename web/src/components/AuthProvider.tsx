"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiFetch, setAccessToken } from "@/lib/api-client";

type User = { id: string; email: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    registerSecret: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const refreshed = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setAccessToken(data.access_token);
        const me = await apiFetch<{ user: User }>("/auth/me");
        setUser(me.user);
        return;
      }
    } catch {
      /* not logged in */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    bootstrap().finally(() => setLoading(false));
  }, [bootstrap]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/v1/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const register = async (
    email: string,
    password: string,
    registerSecret: string,
  ) => {
    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        register_secret: registerSecret,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Registration failed");
    setAccessToken(data.access_token);
    setUser(data.user);
  };

  const logout = async () => {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
