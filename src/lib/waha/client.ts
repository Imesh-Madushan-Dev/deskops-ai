import "server-only";

import { toWhatsappText } from "./text";

/** No-ops until WAHA_BASE_URL/WAHA_API_KEY/WAHA_WEBHOOK_SECRET are set — approvals still record the
 *  outbound message locally so the dashboard and books stay correct even without a live WhatsApp session. */
export function isWahaConfigured() {
  return Boolean(process.env.WAHA_BASE_URL && process.env.WAHA_API_KEY);
}

/** Every WAHA call needs the same base-url normalisation (avoids the //api double-slash from a
 *  trailing slash) and the same API key header. Callers must check `isWahaConfigured()` first. */
function wahaFetch(path: string, init?: RequestInit) {
  const base = process.env.WAHA_BASE_URL!.replace(/\/+$/, "");
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "X-Api-Key": process.env.WAHA_API_KEY!,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
}

async function wahaJson<T>(label: string, path: string, init?: RequestInit): Promise<T> {
  const response = await wahaFetch(path, init);
  if (!response.ok) throw new Error(`${label} failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return (await response.json()) as T;
}

/** WhatsApp now hands out `@lid` privacy ids instead of phone numbers on some chats. Resolve the real
 *  phone via WAHA's lid endpoint so the owner sees a number, not a meaningless id. Returns the digits
 *  (no suffix), or null if WAHA is unconfigured / can't map it — caller falls back to the raw id.
 *  ponytail: no cache; add a 24h cache if lid volume ever makes this a hot path. */
export async function resolveLidToPhone(session: string, lid: string): Promise<string | null> {
  if (!isWahaConfigured()) return null;
  const digits = lid.replace(/@lid$/i, "");
  try {
    const response = await wahaFetch(`/api/${encodeURIComponent(session)}/lids/${encodeURIComponent(digits)}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { pn?: string };
    const pn = data.pn?.replace(/@c\.us$/i, "").trim();
    return pn || null; // WAHA can return an empty pn — treat as unresolved.
  } catch {
    return null;
  }
}

export async function sendWhatsappMessage(session: string, chatId: string, text: string) {
  if (!isWahaConfigured()) return { sent: false, reason: "WAHA is not configured" as const };

  const data = await wahaJson<{ id?: string }>("WhatsApp send", "/api/sendText", {
    method: "POST",
    body: JSON.stringify({ session, chatId, text: toWhatsappText(text) }),
  });
  return { sent: true as const, providerMessageId: data.id ?? null };
}

/** Send a base64-encoded image (e.g. a generated invoice) to a chat. WAHA accepts the raw file bytes
 *  in `file.data`, so no image hosting/storage is needed. */
export async function sendWhatsappImageData(session: string, chatId: string, base64: string, mimetype: string, filename: string, caption?: string) {
  if (!isWahaConfigured()) return { sent: false as const, reason: "WAHA is not configured" as const };

  const data = await wahaJson<{ id?: string }>("WhatsApp image send", "/api/sendImage", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file: { mimetype, filename, data: base64 }, caption: caption ?? "" }),
  });
  return { sent: true as const, providerMessageId: data.id ?? null };
}

/** Send an arbitrary file (e.g. an invoice PDF) as base64 — same shape as sendImage, so no
 *  bucket or public URL is needed. */
export async function sendWhatsappFileData(session: string, chatId: string, base64: string, mimetype: string, filename: string, caption?: string) {
  if (!isWahaConfigured()) return { sent: false as const, reason: "WAHA is not configured" as const };

  const data = await wahaJson<{ id?: string }>("WhatsApp file send", "/api/sendFile", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file: { mimetype, filename, data: base64 }, caption: caption ?? "" }),
  });
  return { sent: true as const, providerMessageId: data.id ?? null };
}

export async function sendWhatsappImage(session: string, chatId: string, imageUrl: string, caption?: string) {
  if (!isWahaConfigured()) return { sent: false, reason: "WAHA is not configured" as const };

  const data = await wahaJson<{ id?: string }>("WhatsApp image send", "/api/sendImage", {
    method: "POST",
    body: JSON.stringify({ session, chatId, file: { url: imageUrl }, caption: caption ?? "" }),
  });
  return { sent: true as const, providerMessageId: data.id ?? null };
}

/* ── Session lifecycle ─────────────────────────────────────────────────────
 * Lets the owner connect/monitor their WhatsApp number from Settings → Integrations
 * instead of logging into the WAHA dashboard. */

/** WAHA's session status enum (`GET /api/sessions/{session}`). */
export type WahaSessionStatus = "STOPPED" | "STARTING" | "SCAN_QR_CODE" | "PASSKEY_REQUIRED" | "PASSKEY_CONFIRMATION_REQUIRED" | "WORKING" | "FAILED";

export type WahaSession = {
  name: string;
  status: WahaSessionStatus;
  me?: { id?: string; pushName?: string; lid?: string } | null;
};

/** Public origin WAHA posts webhooks back to. Localhost is useless here — WAHA runs on Railway and
 *  has to reach us, so local dev needs a tunnel URL in APP_URL. */
function appUrl() {
  const url = process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!url) throw new Error("APP_URL is not set — WAHA needs a public URL to deliver WhatsApp messages to.");
  return url.replace(/\/+$/, "");
}

/** Registered on the session at start time so the owner never configures webhooks by hand.
 *  `session.status` is subscribed alongside `message`; the webhook route acks and ignores it. */
function webhookConfig() {
  return {
    url: `${appUrl()}/api/waha/webhook`,
    events: ["message", "session.status"],
    ...(process.env.WAHA_WEBHOOK_SECRET ? { hmac: { key: process.env.WAHA_WEBHOOK_SECRET } } : {}),
    retries: { delaySeconds: 2, attempts: 15, policy: "exponential" },
  };
}

/** Returns null when the session does not exist in WAHA — "never created" and "deleted" are the
 *  same thing to every caller. */
export async function getWahaSession(name: string): Promise<WahaSession | null> {
  const response = await wahaFetch(`/api/sessions/${encodeURIComponent(name)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`WhatsApp session lookup failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  return (await response.json()) as WahaSession;
}

/** Upsert + start in one call, re-applying the webhook config each time so a session created
 *  elsewhere (e.g. the WAHA dashboard) gets pointed back at this app. */
export async function startWahaSession(name: string): Promise<WahaSession> {
  return wahaJson<WahaSession>("WhatsApp connect", "/api/sessions/start", {
    method: "POST",
    body: JSON.stringify({
      name,
      config: { webhooks: [webhookConfig()], noweb: { store: { enabled: true, fullSync: true } } },
    }),
  });
}

export async function restartWahaSession(name: string) {
  return wahaJson<WahaSession>("WhatsApp restart", `/api/sessions/${encodeURIComponent(name)}/restart`, { method: "POST" });
}

/** Unlinks the number but keeps the session, so the next connect shows a fresh QR. */
export async function logoutWahaSession(name: string) {
  const response = await wahaFetch(`/api/sessions/${encodeURIComponent(name)}/logout`, { method: "POST" });
  if (!response.ok && response.status !== 404) throw new Error(`WhatsApp logout failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
}

export async function deleteWahaSession(name: string) {
  const response = await wahaFetch(`/api/sessions/${encodeURIComponent(name)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw new Error(`WhatsApp disconnect failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
}

/** Raw PNG response — the route streams it straight through rather than buffering the image. */
export function fetchWahaQr(name: string) {
  return wahaFetch(`/api/${encodeURIComponent(name)}/auth/qr?format=image`, { headers: { accept: "image/png" } });
}
