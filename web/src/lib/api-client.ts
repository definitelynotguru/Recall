const API_BASE =
  typeof window !== "undefined"
    ? "/api/v1"
    : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/v1`;

const TOKEN_KEY = "recall_access_token";

export const AUTH_SESSION_EXPIRED = "recall:session-expired";

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

let accessToken: string | null = readStoredToken();

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function getAccessToken() {
  return accessToken;
}

function dispatchSessionExpired() {
  if (typeof window === "undefined") return;
  setAccessToken(null);
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EXPIRED));
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function tokenExpiresWithinMinutes(token: string, minutes: number): boolean {
  const exp = decodeJwtExp(token);
  if (!exp) return false;
  return exp * 1000 - Date.now() < minutes * 60_000;
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) return null;
  const data = await res.json();
  setAccessToken(data.access_token);
  return accessToken;
}

export async function ensureFreshAccessToken(): Promise<boolean> {
  const token = getAccessToken();
  if (!token) return false;
  if (!tokenExpiresWithinMinutes(token, 5)) return true;
  const refreshed = await refreshAccessToken();
  return Boolean(refreshed);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        credentials: "include",
      });
    } else {
      dispatchSessionExpired();
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) dispatchSessionExpired();
    throw new Error(data.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export type ApiNote = {
  id: string;
  title: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ApiReminder = {
  id: string;
  note_id: string;
  fire_at: string;
  timezone: string;
  repeat_rule: string | null;
  intensity: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
