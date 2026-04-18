// Token-bucket rate limit keyed by a caller-supplied identifier (hashed IP
// for unauthenticated routes, user ID for authenticated ones). Stores state
// in Redis so multiple app instances share the same budget.
//
// This is a thin wrapper — the main point is that every sensitive route
// wraps itself in `rateLimit(...)` rather than trusting an edge proxy.

import { createClient } from "redis";

let clientPromise: Promise<ReturnType<typeof createClient>> | null = null;

function getClient() {
  if (!clientPromise) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL is not set");
    clientPromise = createClient({ url }).connect() as Promise<
      ReturnType<typeof createClient>
    >;
  }
  return clientPromise;
}

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSec: number };

/**
 * Allow `capacity` requests per `windowSec` seconds per `key`.
 *
 * Fails closed in production: if Redis is unreachable, the function throws
 * and the caller returns 503. Silent bypass on infrastructure failure would
 * undermine PCI DSS 8.1.6 (account lockout) and 6.6 (API protection).
 */
export async function rateLimit(
  key: string,
  capacity: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const client = await getClient();
  const redisKey = `rl:${key}`;
  const count = await client.incr(redisKey);
  if (count === 1) {
    await client.expire(redisKey, windowSec);
  }
  if (count > capacity) {
    const ttl = await client.ttl(redisKey);
    return { allowed: false, retryAfterSec: ttl > 0 ? ttl : windowSec };
  }
  return { allowed: true, remaining: Math.max(0, capacity - count) };
}
