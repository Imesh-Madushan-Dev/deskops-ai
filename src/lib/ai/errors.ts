export type AssistantErrorCode =
  | "unauthorized"
  | "bad_request"
  | "no_model"
  | "model_unavailable"
  | "provider_error"
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
    detail: "Start a new chat and try again.",
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
  rate_limited: 429,
  offline: 503,
  unknown: 500,
};

/** Server-side: what actually went wrong, as a code. The message text is inspected but never
 *  forwarded — provider errors carry keys and account details in their bodies. */
export function classifyAssistantError(error: unknown): AssistantErrorCode {
  if (!(error instanceof Error)) return "unknown";
  // getCurrentBusiness redirects unauthenticated callers; in a route handler that surfaces as a throw.
  const digest = (error as unknown as { digest?: unknown }).digest;
  if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) return "unauthorized";
  const name = error.name;
  const message = error.message.toLowerCase();

  if (name === "AI_NoSuchModelError" || message.includes("needs") || message.includes("api key")) return "model_unavailable";
  if (name === "AI_APICallError" || name === "AI_LoadAPIKeyError") {
    if (message.includes("rate limit") || message.includes("429")) return "rate_limited";
    return "provider_error";
  }
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
