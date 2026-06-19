export type UserPrefs = {
  defaultReminderHour: number;
  defaultReminderMinute: number;
  showSyncHint: boolean;
};

const KEY = "recall_user_prefs";

const DEFAULTS: UserPrefs = {
  defaultReminderHour: 9,
  defaultReminderMinute: 0,
  showSyncHint: true,
};

export function loadUserPrefs(): UserPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<UserPrefs>;
    return {
      defaultReminderHour: clampHour(parsed.defaultReminderHour ?? DEFAULTS.defaultReminderHour),
      defaultReminderMinute: clampMinute(
        parsed.defaultReminderMinute ?? DEFAULTS.defaultReminderMinute,
      ),
      showSyncHint: parsed.showSyncHint ?? DEFAULTS.showSyncHint,
    };
  } catch {
    return DEFAULTS;
  }
}

export function saveUserPrefs(prefs: UserPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

function clampHour(h: number) {
  return Math.min(23, Math.max(0, Math.round(h)));
}

function clampMinute(m: number) {
  return Math.min(59, Math.max(0, Math.round(m)));
}

const ONBOARDING_KEY = "recall_onboarding_done";

export function isOnboardingDone(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDING_KEY) === "1";
}

export function setOnboardingDone() {
  if (typeof window === "undefined") return;
  localStorage.setItem(ONBOARDING_KEY, "1");
}

export function clearOnboardingDone() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ONBOARDING_KEY);
}
