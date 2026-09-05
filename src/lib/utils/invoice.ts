/** Pure invoice & billing-detail helpers — no DB, no server-only, so they stay checkable on their
 *  own (see invoice.check.ts). */

/** Next number after `previous`. Callers derive `previous` from the HIGHEST existing number, never
 *  from a row count: deleting a customer hard-deletes their invoices, so count+1 would reissue a
 *  number that already exists and collide with the unique (business_id, number) index.
 *  ponytail: zero-padded to 4, which is also what makes a lexical "highest number" sort correct —
 *  past INV-9999 the padding grows and that ordering breaks, so move to a Postgres sequence then. */
export function bumpInvoiceNumber(previous: string | null) {
  const current = Number(previous?.match(/(\d+)\s*$/)?.[1] ?? 0);
  return `INV-${String(current + 1).padStart(4, "0")}`;
}

export type OrderLine = { description: string; quantity: number; unitPrice: number };

/** Same order = same lines, same quantities, same prices; the order of the lines themselves is
 *  irrelevant. This is what tells a re-confirmation apart from a genuinely new order in one chat. */
export function sameOrder(a: OrderLine[], b: OrderLine[]) {
  if (a.length !== b.length) return false;
  const key = (list: OrderLine[]) => list.map((i) => `${i.description.trim().toLowerCase()}|${i.quantity}|${i.unitPrice}`).sort().join("//");
  return key(a) === key(b);
}

/** Did the customer actually SAY this? The agent has the WhatsApp number in context and will happily
 *  fill in a plausible city, which is how "Colombo" landed on a Bill To after we only ever asked for a
 *  name. Billing details must trace back to the customer's own words, so every value is checked against
 *  what they typed before it can be saved.
 *  `said` is the customer's recent inbound messages joined together.
 *  ponytail: phone compares digits, text needs one word (3+ chars) verbatim — lenient enough for
 *  re-casing and re-ordering, strict enough to block invention. A value the customer wrote in Sinhala
 *  and the agent translated is rejected; that is the desired answer (save what they wrote). */
export function statedByCustomer(said: string, value: string, kind: "phone" | "text") {
  const haystack = said.toLowerCase();
  if (kind === "phone") {
    const digits = value.replace(/\D/g, "");
    return digits.length >= 3 && haystack.replace(/\D/g, "").includes(digits);
  }
  const words = value.toLowerCase().split(/[\s,./\-]+/).filter(Boolean);
  const significant = words.filter((w) => w.length >= 3);
  return (significant.length ? significant : words).some((w) => haystack.includes(w));
}
