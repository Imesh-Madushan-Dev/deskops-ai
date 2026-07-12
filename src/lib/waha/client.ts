import "server-only";

/** No-ops until WAHA_BASE_URL/WAHA_API_KEY/WAHA_WEBHOOK_SECRET are set — approvals still record the
 *  outbound message locally so the dashboard and books stay correct even without a live WhatsApp session. */
export function isWahaConfigured() {
  return Boolean(process.env.WAHA_BASE_URL && process.env.WAHA_API_KEY);
}

export async function sendWhatsappMessage(session: string, chatId: string, text: string) {
  if (!isWahaConfigured()) return { sent: false, reason: "WAHA is not configured" as const };

  const response = await fetch(`${process.env.WAHA_BASE_URL}/api/sendText`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": process.env.WAHA_API_KEY! },
    body: JSON.stringify({ session, chatId, text }),
  });
  if (!response.ok) throw new Error(`WAHA send failed: ${response.status} ${await response.text()}`);
  const data = (await response.json()) as { id?: string };
  return { sent: true as const, providerMessageId: data.id ?? null };
}
