/**
 * Lightweight structured logger with secret/PII scrubbing.
 * Prefer this over raw console.* in API routes and shared server code.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

const SENSITIVE_KEY =
  /pass(word)?|secret|token|authorization|cookie|pepper|jwt|api[_-]?key|database_url|refresh/i;

const REDACTED = "[REDACTED]";

function scrubValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEY.test(key)) {
    return REDACTED;
  }
  if (typeof value === "string") {
    // Bearer tokens and long opaque secrets
    if (/^Bearer\s+\S+/i.test(value)) return "Bearer [REDACTED]";
    if (value.length > 24 && /^(eyJ|[A-Za-z0-9_-]{32,})/.test(value)) {
      return REDACTED;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => scrubValue(String(index), item));
  }
  if (value && typeof value === "object") {
    return scrubObject(value as Record<string, unknown>);
  }
  return value;
}

export function scrubObject(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = scrubValue(key, value);
  }
  return out;
}

function emit(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    level,
    msg: message,
    time: new Date().toISOString(),
    ...(fields ? scrubObject(fields) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, fields?: LogFields) {
    if (process.env.NODE_ENV === "production") return;
    emit("debug", message, fields);
  },
  info(message: string, fields?: LogFields) {
    emit("info", message, fields);
  },
  warn(message: string, fields?: LogFields) {
    emit("warn", message, fields);
  },
  error(message: string, fields?: LogFields) {
    emit("error", message, fields);
  },
};
