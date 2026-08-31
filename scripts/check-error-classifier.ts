/**
 * The classifier decides what a user is told to DO about a failure, so a wrong guess sends
 * someone hunting for a bad API key when they are simply out of quota. These cases are shaped
 * like the errors the AI SDK actually throws, including the RetryError wrapper it puts around
 * anything retryable — which is every 429.
 *
 * Run: bun run scripts/check-error-classifier.ts
 */
import assert from "node:assert/strict";
import { classifyAssistantError } from "../src/lib/ai/errors";

function apiCallError(statusCode: number, message: string) {
  const error = new Error(message);
  error.name = "AI_APICallError";
  Object.assign(error, { statusCode });
  return error;
}

/** What streamText throws once its retries are exhausted: the cause is nested, not on top. */
function retryError(lastError: Error) {
  const error = new Error(`Failed after 3 attempts. Last error: ${lastError.message}`);
  error.name = "AI_RetryError";
  Object.assign(error, { lastError, reason: "maxRetriesExceeded" });
  return error;
}

// Verbatim from the Gemini API on 2026-08-31, which is the case that was being misreported.
const GEMINI_QUOTA =
  "You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. " +
  "* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.7-flash";

const cases: [string, unknown, string][] = [
  ["gemini daily quota, wrapped in a retry", retryError(apiCallError(429, GEMINI_QUOTA)), "quota_exhausted"],
  ["gemini daily quota, unwrapped", apiCallError(429, GEMINI_QUOTA), "quota_exhausted"],
  ["a plain rate limit with no quota wording", apiCallError(429, "Too many requests, slow down"), "rate_limited"],
  ["revoked or wrong key", apiCallError(401, "API key not valid. Please pass a valid API key."), "model_unavailable"],
  ["forbidden project", apiCallError(403, "Permission denied"), "model_unavailable"],
  ["bad request from a malformed tool schema", apiCallError(400, "Invalid JSON payload"), "provider_error"],
  ["provider 5xx", apiCallError(503, "The model is overloaded"), "provider_error"],
  ["signed-out redirect", Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login;307;" }), "unauthorized"],
  ["something unrecognised", new Error("kaboom"), "unknown"],
  ["not an Error at all", "kaboom", "unknown"],
];

for (const [label, error, expected] of cases) {
  const actual = classifyAssistantError(error);
  assert.equal(actual, expected, `${label}: expected ${expected}, got ${actual}`);
}

// The specific regression: the old classifier matched on prose, and Google's quota message
// contains neither "rate limit" (it writes "rate-limits") nor the digits "429".
assert.ok(!GEMINI_QUOTA.toLowerCase().includes("rate limit"), "test case no longer covers the prose-matching trap");
assert.ok(!GEMINI_QUOTA.includes("429"), "test case no longer covers the prose-matching trap");

console.log(`ok — ${cases.length} error shapes classified correctly`);
