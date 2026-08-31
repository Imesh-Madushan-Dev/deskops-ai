import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** A spend guard on the LLM routes, not a security control — the limit is per business, since
 *  that is who pays for the tokens. Only constructed when Upstash is configured, so local dev
 *  and CI run unthrottled without needing a Redis. */
const limiter = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(30, "5 m"),
      prefix: "deskops:agent",
      analytics: false,
    })
  : null;

export async function checkAgentLimit(businessId: string): Promise<boolean> {
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(businessId);
    return success;
  } catch {
    // Redis being down must not take the assistant down with it.
    return true;
  }
}
