type Frequency = "daily" | "weekly" | "monthly" | "yearly";

type RepeatRule = {
  freq: Frequency;
  interval: number;
  days?: number[];
  day?: number;
  month?: number;
};

const LEGACY: Record<string, Frequency> = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  yearly: "yearly",
};

const WEEKDAYS: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

export function parseRepeatRule(raw: string | null): RepeatRule | null {
  const rule = raw?.trim();
  if (!rule) return null;

  const legacy = LEGACY[rule.toLowerCase()];
  if (legacy) return { freq: legacy, interval: 1 };

  const parts = new Map<string, string>();
  for (const token of rule.split(";")) {
    const [key, value] = token.split("=", 2);
    if (key && value) parts.set(key.trim().toLowerCase(), value.trim());
  }

  const freqRaw = parts.get("freq")?.toLowerCase();
  if (!freqRaw || !(freqRaw in LEGACY)) return null;

  const intervalRaw = Number(parts.get("interval") ?? "1");
  const interval =
    Number.isInteger(intervalRaw) && intervalRaw > 0
      ? Math.min(intervalRaw, 365)
      : 1;
  const days = parts
    .get("days")
    ?.split(",")
    .map((d) => WEEKDAYS[d.trim().toUpperCase()])
    .filter((d): d is number => d !== undefined)
    .sort((a, b) => a - b);
  const dayRaw = Number(parts.get("day"));
  const monthRaw = Number(parts.get("month"));

  return {
    freq: freqRaw as Frequency,
    interval,
    days: days && days.length > 0 ? days : undefined,
    day: Number.isInteger(dayRaw) && dayRaw >= 1 && dayRaw <= 31 ? dayRaw : undefined,
    month: Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : undefined,
  };
}

export function computeNextRepeat(raw: string | null, from: Date): Date | null {
  const rule = parseRepeatRule(raw);
  if (!rule) return null;
  const d = new Date(from);

  if (rule.freq === "daily") {
    d.setUTCDate(d.getUTCDate() + rule.interval);
    return d;
  }

  if (rule.freq === "weekly") {
    if (rule.days?.length) {
      for (let delta = 1; delta <= 7 * rule.interval; delta += 1) {
        const candidate = new Date(from);
        candidate.setUTCDate(candidate.getUTCDate() + delta);
        if (rule.days.includes(candidate.getUTCDay())) return candidate;
      }
    }
    d.setUTCDate(d.getUTCDate() + 7 * rule.interval);
    return d;
  }

  if (rule.freq === "monthly") {
    return addMonths(d, rule.interval, rule.day);
  }

  if (rule.freq === "yearly") {
    return addYears(d, rule.interval, rule.month, rule.day);
  }

  return null;
}

function addMonths(from: Date, months: number, day?: number): Date {
  const d = new Date(from);
  const targetDay = day ?? d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(Math.min(targetDay, daysInMonth(d.getUTCFullYear(), d.getUTCMonth())));
  return d;
}

function addYears(from: Date, years: number, month?: number, day?: number): Date {
  const d = new Date(from);
  const targetMonth = month ? month - 1 : d.getUTCMonth();
  const targetDay = day ?? d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCFullYear(d.getUTCFullYear() + years, targetMonth, 1);
  d.setUTCDate(Math.min(targetDay, daysInMonth(d.getUTCFullYear(), targetMonth)));
  return d;
}

function daysInMonth(year: number, monthZeroBased: number): number {
  return new Date(Date.UTC(year, monthZeroBased + 1, 0)).getUTCDate();
}
