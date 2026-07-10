export type CachedUser = {
  id: string;
  email: string;
};

const CACHED_USER_KEY = "recall_cached_user";

function isCachedUser(value: unknown): value is CachedUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "email" in value &&
    typeof value.email === "string"
  );
}

export function loadCachedUser(): CachedUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isCachedUser(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveCachedUser(user: CachedUser) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
  } catch {
    // The authenticated online session still works when storage is unavailable.
  }
}

export function clearCachedUser() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CACHED_USER_KEY);
  } catch {
    // There is no cached session to clear when storage is unavailable.
  }
}
