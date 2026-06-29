import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_BUCKETS = 10_000;

type RateLimitOptions = {
  max?: number;
  windowMs?: number;
};

let redisClient: Redis | null = null;
const upstashLimiters = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  if (redisClient !== null) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

function durationFromMs(windowMs: number): Duration {
  return `${Math.round(windowMs / 1000)} s` as Duration;
}

// Sliding-window max/size are fixed at construction, so cache one limiter per
// (max, windowMs) combination and share a single Redis client.
function getUpstashLimiter(redis: Redis, max: number, windowMs: number): Ratelimit {
  const cacheKey = `${max}:${windowMs}`;
  const cached = upstashLimiters.get(cacheKey);
  if (cached) return cached;
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, durationFromMs(windowMs)),
    prefix: "recall:ratelimit",
    analytics: false,
  });
  upstashLimiters.set(cacheKey, limiter);
  return limiter;
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS * 0.9) break;
  }
}

function inMemoryRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  pruneExpiredBuckets(now);
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= max) {
    return false;
  }

  bucket.count++;
  return true;
}

/**
 * Rate limit a key. Uses Upstash Redis (sliding window) when configured, else
 * falls back to an in-memory Map effective per serverless instance only.
 */
export async function rateLimit(
  key: string,
  options?: RateLimitOptions,
): Promise<boolean> {
  const max = options?.max ?? MAX_REQUESTS;
  const windowMs = options?.windowMs ?? WINDOW_MS;

  const redis = getRedis();
  if (redis) {
    const limiter = getUpstashLimiter(redis, max, windowMs);
    const { success } = await limiter.limit(key);
    return success;
  }

  return inMemoryRateLimit(key, max, windowMs);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
