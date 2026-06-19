const buckets = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_BUCKETS = 10_000;

type RateLimitOptions = {
  max?: number;
  windowMs?: number;
};

function pruneExpiredBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS * 0.9) break;
  }
}

/** In-memory limiter — effective per serverless instance only. */
export function rateLimit(key: string, options?: RateLimitOptions): boolean {
  const max = options?.max ?? MAX_REQUESTS;
  const windowMs = options?.windowMs ?? WINDOW_MS;
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

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
