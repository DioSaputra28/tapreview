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

  return {
    isBlocked(key: string, now: number = Date.now()): boolean {
      const bucket = buckets.get(key);
      if (!bucket) return false;
      if (bucket.blockedUntil > 0) {
        if (now < bucket.blockedUntil) return true;
        buckets.delete(key);
        return false;
      }
      return false;
    },

    recordFailure(key: string, now: number = Date.now()): void {
      const bucket = buckets.get(key);
      if (!bucket) {
        buckets.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
      }
      if (bucket.blockedUntil > 0) return;
      if (now >= bucket.windowStart + windowMs) {
        buckets.set(key, { count: 1, windowStart: now, blockedUntil: 0 });
        return;
      }
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
