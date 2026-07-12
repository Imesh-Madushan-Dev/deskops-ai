/** WhatsApp chat ids look like `5708280029415@lid` or `9477…@c.us`. For display, prefer the
 *  saved name, else strip the WhatsApp suffix so the owner sees a clean identifier. */
export function contactLabel(customer?: { name?: string | null; whatsapp_number?: string | null } | null): string {
  if (customer?.name?.trim()) return customer.name;
  const number = customer?.whatsapp_number;
  if (!number) return "Unknown";
  return number.replace(/@(c\.us|lid|s\.whatsapp\.net|g\.us|broadcast|newsletter)$/i, "");
}

/** True for WhatsApp addresses that aren't a real 1:1 customer chat (status broadcasts, channels, groups). */
export function isSystemChatId(from: string): boolean {
  return /@(broadcast|newsletter|g\.us)$/i.test(from) || from === "status@broadcast";
}
