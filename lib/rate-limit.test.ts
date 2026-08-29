import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("blocks a key after max failures within the window", () => {
    const rl = createRateLimiter({ maxAttempts: 3, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    expect(rl.isBlocked("ip:slug", now)).toBe(false);
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    rl.recordFailure("ip:slug", now + 2_000);
    expect(rl.isBlocked("ip:slug", now + 3_000)).toBe(true);
  });

  it("unblocks after blockMs", () => {
    const rl = createRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(true);
    expect(rl.isBlocked("ip:slug", now + 61_000)).toBe(false);
  });

  it("resets the window after windowMs when max not reached", () => {
    const rl = createRateLimiter({ maxAttempts: 5, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 70_000)).toBe(false);
    rl.recordFailure("ip:slug", now + 70_000);
    expect(rl.isBlocked("ip:slug", now + 70_000)).toBe(false);
  });

  it("expires a stale block on recordFailure without a preceding isBlocked", () => {
    const rl = createRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(true);

    rl.recordFailure("ip:slug", now + 61_000);
    rl.recordFailure("ip:slug", now + 62_000);
    expect(rl.isBlocked("ip:slug", now + 63_000)).toBe(true);
  });

  it("clear removes a block", () => {
    const rl = createRateLimiter({ maxAttempts: 2, windowMs: 60_000, blockMs: 60_000 });
    const now = 1_000_000;
    rl.recordFailure("ip:slug", now);
    rl.recordFailure("ip:slug", now + 1_000);
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(true);
    rl.clear("ip:slug");
    expect(rl.isBlocked("ip:slug", now + 2_000)).toBe(false);
  });
});
