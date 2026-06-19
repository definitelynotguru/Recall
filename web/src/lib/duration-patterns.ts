import patterns from "../../shared/duration-patterns.json";

type DetectConfidence = "high" | "maybe";
type RepeatRule = "daily" | "weekly" | "monthly" | "yearly" | null;

type DurationRuleSpec = {
  id: string;
  regex: string;
  resolve:
    | "plusMinutes"
    | "plusSeconds"
    | "plusHours"
    | "eveningToday"
    | "tomorrowDefault"
    | "plusDaysDefault";
  captureGroup?: number;
  min?: number;
  max?: number;
  seconds?: number;
  days?: number;
  priority: number;
  confidence: DetectConfidence;
  reason: string;
};

const DURATION_NUMBER_WORDS: Record<string, number> = patterns.numberWords;

const DURATION_RULES: DurationRuleSpec[] = patterns.rules as DurationRuleSpec[];

function parseCountToken(token: string): number | null {
  const n = Number(token);
  if (!Number.isNaN(n)) return n;
  return DURATION_NUMBER_WORDS[token.toLowerCase()] ?? null;
}

type DurationEmitContext = {
  text: string;
  title: string;
  reference: Date;
  defaultHour: number;
  defaultMinute: number;
  inferRepeat: (
    context: string,
    title: string,
  ) => { repeatRule: RepeatRule; reason: string };
  contextAround: (text: string, index: number) => string;
  pushDetected: (opts: {
    fireAt: Date;
    label: string;
    reason: string;
    source: string;
    repeatRule: RepeatRule;
    priority: number;
    confidence: DetectConfidence;
    usedDefaultTime: boolean;
    idOverride?: string;
  }) => void;
};

export function scanDurationPhrases(ctx: DurationEmitContext) {
  const refMs = ctx.reference.getTime();

  for (const rule of DURATION_RULES) {
    const re = new RegExp(rule.regex, "gi");
    for (const m of ctx.text.matchAll(re)) {
      const target = resolveTarget(rule, m, refMs, ctx) ?? null;
      if (!target || target.getTime() <= refMs) continue;

      const index = m.index ?? 0;
      const hay = ctx.contextAround(ctx.text, index);
      const { repeatRule, reason: repeatReason } = ctx.inferRepeat(hay, ctx.title);
      const n = rule.captureGroup != null ? m[rule.captureGroup] : "";
      const reason = rule.reason.replace("{n}", n) + ` · ${repeatReason}`;

      ctx.pushDetected({
        fireAt: target,
        label: ctx.title.trim() || m[0].trim(),
        reason,
        source: m[0],
        repeatRule,
        priority: rule.priority,
        confidence: rule.confidence,
        usedDefaultTime: false,
        idOverride: `dur-${target.getTime()}-${repeatRule ?? "once"}`,
      });
    }
  }
}

function resolveTarget(
  rule: DurationRuleSpec,
  m: RegExpMatchArray,
  refMs: number,
  ctx: DurationEmitContext,
): Date | null {
  switch (rule.resolve) {
    case "plusMinutes": {
      const token = m[rule.captureGroup ?? 1];
      const n = parseCountToken(token);
      if (n == null || n < (rule.min ?? 1) || n > (rule.max ?? 999)) return null;
      return new Date(refMs + n * 60_000);
    }
    case "plusSeconds":
      return new Date(refMs + (rule.seconds ?? 0) * 1000);
    case "plusHours": {
      const token = m[rule.captureGroup ?? 1];
      const n = parseCountToken(token);
      if (n == null || n < (rule.min ?? 1) || n > (rule.max ?? 48)) return null;
      return new Date(refMs + n * 3_600_000);
    }
    case "eveningToday": {
      const evening = new Date(ctx.reference);
      evening.setHours(20, 0, 0, 0);
      return evening.getTime() > refMs ? evening : new Date(refMs + 3_600_000);
    }
    case "tomorrowDefault": {
      const d = new Date(ctx.reference);
      d.setDate(d.getDate() + 1);
      d.setHours(ctx.defaultHour, ctx.defaultMinute, 0, 0);
      return d;
    }
    case "plusDaysDefault": {
      const d = new Date(ctx.reference);
      d.setDate(d.getDate() + (rule.days ?? 7));
      d.setHours(ctx.defaultHour, ctx.defaultMinute, 0, 0);
      return d;
    }
    default:
      return null;
  }
}
