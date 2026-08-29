export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockMs: number;
}

interface Bucket {
  count: number;
  windowStart: number;
  blockedUntil: number;
}

export function createRateLimiter({
  maxAttempts = 5,
  windowMs = 60_000,
  blockMs = 15 * 60_000,
}: Partial<RateLimitConfig> = {}) {
  const buckets = new Map<string, Bucket>();

  function resolve(key: string, now: number): Bucket | undefined {
    const bucket = buckets.get(key);
    if (!bucket) return undefined;
    if (bucket.blockedUntil > 0) {
      if (now < bucket.blockedUntil) return bucket;
      buckets.delete(key);
      return undefined;
    }
    if (now >= bucket.windowStart + windowMs) {
      buckets.delete(key);
      return undefined;
    }
    return bucket;
  }

  return {
    isBlocked(key: string, now: number = Date.now()): boolean {
      const bucket = resolve(key, now);
      return !!bucket && bucket.blockedUntil > 0;
    },

    recordFailure(key: string, now: number = Date.now()): void {
      const bucket = resolve(key, now);
      if (!bucket) {
        buckets.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
      }
      if (bucket.blockedUntil > 0) return;
      bucket.count += 1;
      if (bucket.count >= maxAttempts) {
        bucket.blockedUntil = now + blockMs;
      }
    },

    clear(key: string): void {
      buckets.delete(key);
    },
  };
}

export const tokenRateLimiter = createRateLimiter();
