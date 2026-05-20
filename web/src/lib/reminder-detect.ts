import { loadUserPrefs } from "./user-prefs";

export type RepeatRule = "daily" | "weekly" | "monthly" | "yearly" | null;

export type DetectOptions = {
  defaultHour?: number;
  defaultMinute?: number;
};

export type DetectedReminder = {
  id: string;
  fireAt: string;
  repeatRule: RepeatRule;
  label: string;
  reason: string;
  source: string;
  priority: number;
  usedDefaultTime: boolean;
};

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10,
  november: 11, nov: 11, december: 12, dec: 12,
};

const YEARLY_KEYWORDS =
  /\b(birthday|b-?day|born|anniversary|every\s+year|yearly|annual)\b/i;
const MONTHLY_KEYWORDS =
  /\b(monthly|every\s+month|each\s+month|rent\s+due|pay\s+day)\b/i;
const WEEKLY_KEYWORDS =
  /\b(weekly|every\s+week|each\s+week|week\s+on)\b/i;
const DAILY_KEYWORDS = /\b(daily|every\s+day|each\s+day|morning\s+routine)\b/i;

const VERSION_LIKE = /\b\d+\.\d+(\.\d+)?\b/;
const MAX_SUGGESTIONS = 5;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string {
  const d = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function parseTimeToken(raw: string): { hour: number; minute: number } | null {
  const t = raw.trim().toLowerCase();
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }
  const m12 = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m12) {
    let h = Number(m12[1]);
    const min = m12[2] ? Number(m12[2]) : 0;
    const ap = m12[3].toLowerCase();
    if (h === 12) h = 0;
    if (ap === "pm") h += 12;
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return { hour: h, minute: min };
  }
  const at = t.match(/^at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (at) return parseTimeToken(`${at[1]}:${at[2] ?? "00"}${at[3] ? ` ${at[3]}` : ""}`);
  return null;
}

function resolveYear(y: number): number {
  if (y < 100) return y >= 70 ? 1900 + y : 2000 + y;
  return y;
}

function monthFromToken(token: string): number | null {
  const n = Number(token);
  if (!Number.isNaN(n) && n >= 1 && n <= 12) return n;
  return MONTHS[token.toLowerCase()] ?? null;
}

function inferRepeat(context: string, title: string): {
  repeatRule: RepeatRule;
  reason: string;
} {
  const hay = `${title} ${context}`.toLowerCase();
  if (YEARLY_KEYWORDS.test(hay)) {
    return { repeatRule: "yearly", reason: "Looks like a birthday or anniversary" };
  }
  if (MONTHLY_KEYWORDS.test(hay)) {
    return { repeatRule: "monthly", reason: "Repeating monthly event" };
  }
  if (WEEKLY_KEYWORDS.test(hay)) {
    return { repeatRule: "weekly", reason: "Repeating weekly event" };
  }
  if (DAILY_KEYWORDS.test(hay)) {
    return { repeatRule: "daily", reason: "Repeating daily event" };
  }
  if (/\bbirthday\b/i.test(title)) {
    return { repeatRule: "yearly", reason: "Title mentions birthday" };
  }
  return { repeatRule: null, reason: "One-time reminder" };
}

function contextAround(text: string, index: number, radius = 120): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end);
}

function isLikelyFalsePositive(match: string, context: string): boolean {
  if (VERSION_LIKE.test(match) && !/\b(19|20)\d{2}\b/.test(match)) return true;
  if (/\b\d{10,}\b/.test(match)) return true;
  if (/\breleased in\b/i.test(context) && !/\b(at|on|by)\b/i.test(context)) {
    return true;
  }
  return false;
}

function makeId(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  repeat: RepeatRule,
): string {
  return `${year}-${pad(month)}-${pad(day)}-${pad(hour)}${pad(minute)}-${repeat ?? "once"}`;
}

function pushCandidate(
  out: DetectedReminder[],
  seen: Set<string>,
  opts: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    label: string;
    reason: string;
    source: string;
    repeatRule: RepeatRule;
    priority: number;
    defaultHour: number;
    defaultMinute: number;
  },
) {
  const usedDefaultTime = opts.hour === undefined;
  const hour = opts.hour ?? opts.defaultHour;
  const minute = opts.minute ?? opts.defaultMinute;
  const fireAt = toIso(opts.year, opts.month, opts.day, hour, minute);
  if (!fireAt) return;
  const id = makeId(opts.year, opts.month, opts.day, hour, minute, opts.repeatRule);
  if (seen.has(id)) return;
  seen.add(id);
  let reason = opts.reason;
  if (usedDefaultTime) {
    reason += ` · No time found — default ${formatDefaultTime(hour, minute)}`;
  }
  out.push({
    id,
    fireAt,
    repeatRule: opts.repeatRule,
    label: opts.label,
    reason,
    source: opts.source.trim().slice(0, 120),
    priority: opts.priority,
    usedDefaultTime,
  });
}

function formatDefaultTime(hour: number, minute: number) {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function parseTitleLine(
  title: string,
  out: DetectedReminder[],
  seen: Set<string>,
  defaults: { defaultHour: number; defaultMinute: number },
) {
  const sep = title.match(/^(.+?)\s*(?:—|-|\|)\s*(.+)$/);
  if (!sep) return;
  const label = sep[1].trim();
  const datePart = sep[2].trim();
  const inner: DetectedReminder[] = [];
  const innerSeen = new Set<string>();
  scanDatePatterns(datePart, label, inner, innerSeen, defaults, 25);
  inner.forEach((r) => {
    if (seen.has(r.id)) return;
    seen.add(r.id);
    out.push({ ...r, label, priority: r.priority + 5 });
  });
}

function parseStructuredFields(
  text: string,
  title: string,
  out: DetectedReminder[],
  seen: Set<string>,
  defaults: { defaultHour: number; defaultMinute: number },
) {
  const blocks = text.split(/\n{2,}/);
  for (const block of blocks) {
    const dayM = block.match(/(?:^|\n)\s*(?:day|date)\s*[:=]\s*(\d{1,2})(?:st|nd|rd|th)?/im);
    const monthM = block.match(
      /(?:^|\n)\s*month\s*[:=]\s*([A-Za-z]+|\d{1,2})/im,
    );
    const yearM = block.match(/(?:^|\n)\s*year\s*[:=]\s*(\d{2,4})/im);
    const timeM = block.match(/(?:^|\n)\s*time\s*[:=]\s*([^\n]+)/im);
    if (!dayM || !monthM || !yearM) continue;

    const day = Number(dayM[1]);
    const month = monthFromToken(monthM[1]);
    const year = resolveYear(Number(yearM[1]));
    if (!month || day < 1 || day > 31) continue;

    const time = timeM ? parseTimeToken(timeM[1]) : null;
    const { repeatRule, reason } = inferRepeat(block, title);

    pushCandidate(out, seen, {
      year,
      month,
      day,
      hour: time?.hour,
      minute: time?.minute,
      label: title.trim() || `Reminder · ${pad(day)}/${pad(month)}/${year}`,
      reason,
      source: block.trim(),
      repeatRule,
      priority: 20,
      ...defaults,
    });
  }
}

function scanDatePatterns(
  text: string,
  title: string,
  out: DetectedReminder[],
  seen: Set<string>,
  defaults: { defaultHour: number; defaultMinute: number },
  priorityBoost = 0,
) {
  const patterns: {
    re: RegExp;
    pick: (m: RegExpMatchArray) => {
      year: number;
      month: number;
      day: number;
      hour?: number;
      minute?: number;
    } | null;
  }[] = [
    {
      re: /\b(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/gi,
      pick: (m) => ({
        year: Number(m[1]),
        month: Number(m[2]),
        day: Number(m[3]),
        hour: m[4] ? Number(m[4]) : undefined,
        minute: m[5] ? Number(m[5]) : undefined,
      }),
    },
    {
      re: /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})\s*(am|pm)?)?/gi,
      pick: (m) => {
        const a = Number(m[1]);
        const b = Number(m[2]);
        const y = resolveYear(Number(m[3]));
        let month = a;
        let day = b;
        if (a > 12 && b <= 12) {
          day = a;
          month = b;
        } else if (b > 12 && a <= 12) {
          month = a;
          day = b;
        }
        const time =
          m[4] && m[5]
            ? parseTimeToken(`${m[4]}:${m[5]}${m[6] ? ` ${m[6]}` : ""}`)
            : null;
        return { year: y, month, day, hour: time?.hour, minute: time?.minute };
      },
    },
    {
      re: /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\s+(\d{2,4})(?:,?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/gi,
      pick: (m) => {
        const month = monthFromToken(m[2]);
        if (!month) return null;
        const time = m[4] ? parseTimeToken(m[4]) : null;
        return {
          year: resolveYear(Number(m[3])),
          month,
          day: Number(m[1]),
          hour: time?.hour,
          minute: time?.minute,
        };
      },
    },
    {
      re: /\b([A-Za-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{2,4})(?:,?\s*(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?/gi,
      pick: (m) => {
        const month = monthFromToken(m[1]);
        if (!month) return null;
        const time = m[4] ? parseTimeToken(m[4]) : null;
        return {
          year: resolveYear(Number(m[3])),
          month,
          day: Number(m[2]),
          hour: time?.hour,
          minute: time?.minute,
        };
      },
    },
  ];

  for (const { re, pick } of patterns) {
    for (const m of text.matchAll(re)) {
      const ctx = contextAround(text, m.index ?? 0);
      if (isLikelyFalsePositive(m[0], ctx)) continue;
      const parts = pick(m);
      if (!parts || parts.month < 1 || parts.month > 12) continue;
      if (parts.day < 1 || parts.day > 31) continue;
      const { repeatRule, reason } = inferRepeat(ctx, title);
      pushCandidate(out, seen, {
        ...parts,
        label: title.trim() || m[0].trim(),
        reason,
        source: m[0],
        repeatRule,
        priority: 10 + priorityBoost,
        ...defaults,
      });
    }
  }
}

export function detectRemindersInNote(
  title: string,
  body: string,
  options?: DetectOptions,
): DetectedReminder[] {
  const prefs = loadUserPrefs();
  const defaults = {
    defaultHour: options?.defaultHour ?? prefs.defaultReminderHour,
    defaultMinute: options?.defaultMinute ?? prefs.defaultReminderMinute,
  };

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  if (!trimmedTitle && !trimmedBody) return [];

  const out: DetectedReminder[] = [];
  const seen = new Set<string>();

  if (trimmedTitle) {
    parseTitleLine(trimmedTitle, out, seen, defaults);
    scanDatePatterns(trimmedTitle, trimmedTitle, out, seen, defaults, 15);
  }

  const bodyText = trimmedBody || `${trimmedTitle}\n\n${trimmedBody}`;
  parseStructuredFields(bodyText, trimmedTitle, out, seen, defaults);
  if (trimmedBody) {
    scanDatePatterns(trimmedBody, trimmedTitle, out, seen, defaults, 0);
  }

  const now = Date.now();
  return out
    .filter((r) => new Date(r.fireAt).getTime() > now - 86_400_000)
    .sort((a, b) => b.priority - a.priority || a.fireAt.localeCompare(b.fireAt))
    .slice(0, MAX_SUGGESTIONS);
}

export function formatRepeatLabel(repeat: RepeatRule): string {
  if (!repeat) return "Once";
  return repeat.charAt(0).toUpperCase() + repeat.slice(1);
}

export function isDuplicateOfExisting(
  detected: DetectedReminder,
  existing: { fire_at: string; repeat_rule: string | null }[],
): boolean {
  const d = new Date(detected.fireAt);
  return existing.some((e) => {
    const ex = new Date(e.fire_at);
    const sameRepeat =
      (detected.repeatRule ?? "") === (e.repeat_rule ?? "");
    if (detected.repeatRule === "yearly" && e.repeat_rule === "yearly") {
      return (
        d.getMonth() === ex.getMonth() &&
        d.getDate() === ex.getDate() &&
        Math.abs(d.getHours() - ex.getHours()) < 2
      );
    }
    if (sameRepeat) {
      return (
        d.getFullYear() === ex.getFullYear() &&
        d.getMonth() === ex.getMonth() &&
        d.getDate() === ex.getDate()
      );
    }
    return Math.abs(d.getTime() - ex.getTime()) < 3_600_000;
  });
}

export function pickNextReminder<T extends { fire_at: string; status: string }>(
  reminders: T[],
): T | null {
  const active = reminders
    .filter((r) => r.status === "active")
    .sort((a, b) => a.fire_at.localeCompare(b.fire_at));
  const now = Date.now();
  return active.find((r) => new Date(r.fire_at).getTime() >= now) ?? active[0] ?? null;
}
