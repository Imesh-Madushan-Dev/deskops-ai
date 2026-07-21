import "server-only";

/** No-ops until WAHA_BASE_URL/WAHA_API_KEY/WAHA_WEBHOOK_SECRET are set — approvals still record the
 *  outbound message locally so the dashboard and books stay correct even without a live WhatsApp session. */
export function isWahaConfigured() {
  return Boolean(process.env.WAHA_BASE_URL && process.env.WAHA_API_KEY);
}

/** WhatsApp now hands out `@lid` privacy ids instead of phone numbers on some chats. Resolve the real
 *  phone via WAHA's lid endpoint so the owner sees a number, not a meaningless id. Returns the digits
 *  (no suffix), or null if WAHA is unconfigured / can't map it — caller falls back to the raw id.
 *  ponytail: no cache; add a 24h cache if lid volume ever makes this a hot path. */
export async function resolveLidToPhone(session: string, lid: string): Promise<string | null> {
  if (!isWahaConfigured()) return null;
  const digits = lid.replace(/@lid$/i, "");
  const base = process.env.WAHA_BASE_URL!.replace(/\/+$/, "");
  try {
    const response = await fetch(`${base}/api/${encodeURIComponent(session)}/lids/${encodeURIComponent(digits)}`, {
      headers: { accept: "application/json", "X-Api-Key": process.env.WAHA_API_KEY! },
    });
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

  const base = process.env.WAHA_BASE_URL!.replace(/\/+$/, ""); // avoid the //api double-slash from a trailing slash
  const response = await fetch(`${base}/api/sendText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": process.env.WAHA_API_KEY! },
    body: JSON.stringify({ session, chatId, text }),
  });
  if (!response.ok) throw new Error(`WhatsApp send failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const data = (await response.json()) as { id?: string };
  return { sent: true as const, providerMessageId: data.id ?? null };
}

export async function sendWhatsappImage(session: string, chatId: string, imageUrl: string, caption?: string) {
  if (!isWahaConfigured()) return { sent: false, reason: "WAHA is not configured" as const };

  const base = process.env.WAHA_BASE_URL!.replace(/\/+$/, "");
  const response = await fetch(`${base}/api/sendImage`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": process.env.WAHA_API_KEY! },
    body: JSON.stringify({ session, chatId, file: { url: imageUrl }, caption: caption ?? "" }),
  });
  if (!response.ok) throw new Error(`WhatsApp image send failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
  const data = (await response.json()) as { id?: string };
  return { sent: true as const, providerMessageId: data.id ?? null };
}
