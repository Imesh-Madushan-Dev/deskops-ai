/** Pure WAHA session naming/formatting. Kept out of the server-only client so routes, scripts and
 *  (if ever needed) client code can all share one definition of how a business maps to a session. */

/** Session name for a business that has never connected. Deterministic so a WAHA session and a
 *  business row can always be matched back up. */
export function sessionNameFor(businessId: string) {
  return `biz-${businessId}`;
}

/** A business that already has a session name keeps it — its live WAHA session, webhook config and
 *  linked phone are all keyed by that name, so renaming would silently orphan the connection. */
export function resolveSessionName(business: { id: string; whatsapp_session: string | null }) {
  return business.whatsapp_session ?? sessionNameFor(business.id);
}

/** WAHA reports the connected account as a chat id (`94705864530@c.us`); owners want the number. */
export function phoneFromWahaId(id: string | null | undefined) {
  const digits = (id ?? "").replace(/@c\.us$/i, "").trim();
  return digits || null;
}
