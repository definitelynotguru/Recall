"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  AUTH_SESSION_EXPIRED,
  ensureFreshAccessToken,
  getAccessToken,
  setAccessToken,
} from "@/lib/api-client";
import { isOnboardingDone } from "@/lib/user-prefs";
import { OnboardingDialog } from "./OnboardingDialog";

type User = { id: string; email: string };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  showOnboarding: boolean;
  dismissOnboarding: () => void;
  replayOnboarding: () => void;
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
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

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
        if (!isOnboardingDone()) setShowOnboarding(true);
        return;
      }
    } catch {
      /* not logged in */
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      bootstrap().finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(id);
  }, [bootstrap]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      router.replace("/login?reason=session_expired");
    };
    window.addEventListener(AUTH_SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED, onExpired);
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      const token = getAccessToken();
      if (token) ensureFreshAccessToken();
    }, 60_000);
    return () => clearInterval(id);
  }, [user]);

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
    if (!isOnboardingDone()) setShowOnboarding(true);
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
    setShowOnboarding(true);
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
      value={{
        user,
        loading,
        showOnboarding,
        dismissOnboarding: () => setShowOnboarding(false),
        replayOnboarding: () => setShowOnboarding(true),
        login,
        register,
        logout,
      }}
    >
      {children}
      <OnboardingDialog
        open={showOnboarding && Boolean(user)}
        onClose={() => setShowOnboarding(false)}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
