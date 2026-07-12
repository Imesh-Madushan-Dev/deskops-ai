import "server-only";

/** No-ops until WAHA_BASE_URL/WAHA_API_KEY/WAHA_WEBHOOK_SECRET are set — approvals still record the
 *  outbound message locally so the dashboard and books stay correct even without a live WhatsApp session. */
export function isWahaConfigured() {
  return Boolean(process.env.WAHA_BASE_URL && process.env.WAHA_API_KEY);
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
