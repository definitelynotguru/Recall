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
  refreshAccessToken,
  setAccessToken,
} from "@/lib/api-client";
import {
  clearOnboardingDone,
  isOnboardingDone,
  setOnboardingDone,
} from "@/lib/user-prefs";
import { getLocalNotes, clearLocalNotes } from "@/lib/local-notes";
import {
  clearCachedUser,
  loadCachedUser,
  saveCachedUser,
} from "@/lib/auth-cache";
import { useOnMount } from "@/hooks/useOnMount";
import { OnboardingDialog } from "./OnboardingDialog";

type User = { id: string; email: string };
type AuthStatus = "loading" | "authenticated" | "offline" | "anonymous";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
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
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter();

  const bootstrap = useCallback(async () => {
    const cachedUser = loadCachedUser();
    try {
      const token = await refreshAccessToken();
      if (token) {
        const me = await apiFetch<{ user: User }>("/auth/me");
        setUser(me.user);
        saveCachedUser(me.user);
        setStatus("authenticated");
        if (!isOnboardingDone()) setShowOnboarding(true);
        return;
      }
      clearCachedUser();
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
    } catch {
      setUser(cachedUser);
      setStatus(cachedUser ? "offline" : "anonymous");
    }
  }, []);

  useOnMount(() => {
    void bootstrap();
  });

  useEffect(() => {
    const onExpired = () => {
      clearCachedUser();
      setUser(null);
      setStatus("anonymous");
      router.replace("/login?reason=session_expired");
    };
    window.addEventListener(AUTH_SESSION_EXPIRED, onExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED, onExpired);
  }, [router]);

  useEffect(() => {
    if (status !== "offline") return;
    const onOnline = () => {
      void bootstrap();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [bootstrap, status]);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(() => {
      const token = getAccessToken();
      if (token) void ensureFreshAccessToken();
    }, 60_000);
    return () => clearInterval(id);
  }, [user]);

  const migrateLocalNotes = useCallback(async () => {
    try {
      const localNotes = await getLocalNotes();
      if (localNotes.length === 0) return 0;
      for (const note of localNotes) {
        await apiFetch("/notes", {
          method: "POST",
          body: JSON.stringify({
            id: note.id,
            title: note.title,
            body: note.body,
            status: note.status,
            pinned_at: note.pinned_at,
          }),
        });
      }
      await clearLocalNotes();
      return localNotes.length;
    } catch {
      return 0;
    }
  }, []);

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
    saveCachedUser(data.user);
    setStatus("authenticated");
    await migrateLocalNotes();
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
    saveCachedUser(data.user);
    setStatus("authenticated");
    await migrateLocalNotes();
    setShowOnboarding(true);
  };

  const logout = async () => {
    try {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      clearCachedUser();
      setAccessToken(null);
      setUser(null);
      setStatus("anonymous");
    }
  };

  const dismissOnboarding = useCallback(() => {
    setOnboardingDone();
    setShowOnboarding(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        loading: status === "loading",
        showOnboarding,
        dismissOnboarding,
        replayOnboarding: () => {
          clearOnboardingDone();
          setShowOnboarding(true);
        },
        login,
        register,
        logout,
      }}
    >
      {children}
      <OnboardingDialog
        open={showOnboarding && Boolean(user)}
        onClose={dismissOnboarding}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
