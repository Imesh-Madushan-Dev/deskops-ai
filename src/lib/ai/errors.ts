export type AssistantErrorCode =
  | "unauthorized"
  | "bad_request"
  | "no_model"
  | "model_unavailable"
  | "provider_error"
  | "quota_exhausted"
  | "rate_limited"
  | "offline"
  | "unknown";

export type AssistantErrorCopy = {
  title: string;
  detail: string;
  retryable: boolean;
};

/** A code goes in, something a person can act on comes out. The raw Error never reaches the screen. */
const COPY: Record<AssistantErrorCode, AssistantErrorCopy> = {
  unauthorized: {
    title: "Your session expired",
    detail: "Sign in again and your message will still be here.",
    retryable: false,
  },
  bad_request: {
    title: "That message couldn't be sent",
    detail: "The request was rejected before it reached the model. Try rephrasing, or start a new chat if it keeps happening.",
    retryable: false,
  },
  no_model: {
    title: "No model is configured",
    detail: "Add an API key for your chosen provider to the server environment, then restart.",
    retryable: false,
  },
  model_unavailable: {
    title: "That model isn't available",
    detail: "Its API key is missing. Pick another provider in Settings → Models.",
    retryable: false,
  },
  provider_error: {
    title: "The model provider rejected the request",
    detail: "Usually an invalid key, or you're out of quota.",
    retryable: true,
  },
  quota_exhausted: {
    title: "This model is out of quota",
    detail:
      "Free Gemini quota is counted per model per day, so another model in the picker beside the message box will still work. Otherwise enable billing on the Google AI Studio project, or try again tomorrow.",
    retryable: false,
  },
  rate_limited: {
    title: "Too many requests",
    detail: "You've hit the limit for now. Wait a minute and try again.",
    retryable: true,
  },
  offline: {
    title: "You're offline",
    detail: "The assistant needs a connection. Your message is still here.",
    retryable: true,
  },
  unknown: {
    title: "The assistant stopped unexpectedly",
    detail: "Nothing was lost — try that again.",
    retryable: true,
  },
};

const CODES = Object.keys(COPY) as AssistantErrorCode[];

const STATUS: Record<AssistantErrorCode, number> = {
  unauthorized: 401,
  bad_request: 400,
  no_model: 500,
  model_unavailable: 400,
  provider_error: 502,
  quota_exhausted: 429,
  rate_limited: 429,
  offline: 503,
  unknown: 500,
};

/** The SDK retries transient failures and throws an AI_RetryError wrapping the real cause, so
 *  classifying the outer error alone reports "unknown" for every 429 and 5xx. */
function rootCause(error: Error): Error {
  const last = (error as { lastError?: unknown }).lastError;
  return last instanceof Error ? last : error;
}

/** Server-side: what actually went wrong, as a code. Prefer the HTTP status the provider actually
 *  returned over matching its prose — Google says "exceeded your current quota" and links to
 *  ".../rate-limits", which no reasonable string match catches, and a wrong guess here is what
 *  tells someone their key is invalid when they are simply out of quota.
 *  The message text is inspected but never forwarded: provider bodies carry keys and account details. */
export function classifyAssistantError(error: unknown): AssistantErrorCode {
  if (!(error instanceof Error)) return "unknown";
  // getCurrentBusiness redirects unauthenticated callers; in a route handler that surfaces as a throw.
  const digest = (error as unknown as { digest?: unknown }).digest;
  if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return "unauthorized";

  const cause = rootCause(error);
  const name = cause.name;
  const message = cause.message.toLowerCase();
  const status = (cause as { statusCode?: unknown }).statusCode;

  if (name === "AI_NoSuchModelError") return "model_unavailable";
  if (name === "AI_LoadAPIKeyError" || message.includes("api key")) return "model_unavailable";

  if (typeof status === "number") {
    // Out of quota and rate-limited share a status; only the body separates them, and they have
    // different fixes — switch model or add billing, versus wait a minute.
    if (status === 429) {
      return message.includes("quota") || message.includes("resource_exhausted") ? "quota_exhausted" : "rate_limited";
    }
    if (status === 401 || status === 403) return "model_unavailable";
    if (status >= 400) return "provider_error";
  }
  if (name === "AI_APICallError") return "provider_error";

  if (message.includes("not signed in") || message.includes("unauthorized") || message.includes("no business")) return "unauthorized";
  return "unknown";
}

/** The only shape either LLM route returns on failure. Logs the real error, ships only the code. */
export function assistantErrorResponse(error: unknown, code?: AssistantErrorCode): Response {
  const resolved = code ?? classifyAssistantError(error);
  if (error) console.error(`[assistant:${resolved}]`, error);
  return Response.json({ error: { code: resolved } }, { status: STATUS[resolved] });
}

/** Passed as `onError` to toUIMessageStreamResponse — a mid-stream failure gets the same
 *  treatment as one thrown before the response started. */
export function assistantErrorMessage(error: unknown): string {
  const code = classifyAssistantError(error);
  console.error(`[assistant:${code}]`, error);
  return JSON.stringify({ error: { code } });
}

/** useChat surfaces a failed response as an Error whose message is the raw body.
 *  Ours is JSON; anything else (a proxy, a crash page) falls through to unknown. */
function parseCode(message: string): AssistantErrorCode {
  try {
    const body = JSON.parse(message) as { error?: { code?: string } };
    const code = body.error?.code;
    if (code && CODES.includes(code as AssistantErrorCode)) return code as AssistantErrorCode;
  } catch {
    // Not JSON — fall through.
  }
  return "unknown";
}

export function describeAssistantError(error: Error | undefined, isOffline: boolean): AssistantErrorCopy | null {
  if (!error) return null;
  // A dead connection explains every other symptom, so it wins.
  if (isOffline) return COPY.offline;
  return COPY[parseCode(error.message)];
}
