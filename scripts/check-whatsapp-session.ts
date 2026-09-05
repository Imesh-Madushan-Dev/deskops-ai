/**
 * Two small rules decide whether an owner's WhatsApp keeps working, and both fail silently if wrong:
 * a business that already has a session name must NEVER be renamed (its live WAHA session, webhook
 * and linked phone are all keyed by that name), and the connected account must render as a phone
 * number rather than a raw `@c.us` chat id.
 *
 * Run: bun run scripts/check-whatsapp-session.ts
 */
import assert from "node:assert/strict";
import { phoneFromWahaId, resolveSessionName as resolve } from "../src/lib/waha/session";

// An already-connected business keeps its name, whatever it is — including legacy hand-typed ones.
assert.equal(resolve({ id: "3f1c…", whatsapp_session: "new" }), "new");
assert.equal(resolve({ id: "3f1c…", whatsapp_session: "default" }), "default");

// Only a business that has never connected gets a generated name, and it is stable across calls.
assert.equal(resolve({ id: "abc-123", whatsapp_session: null }), "biz-abc-123");
assert.equal(resolve({ id: "abc-123", whatsapp_session: null }), resolve({ id: "abc-123", whatsapp_session: null }));
assert.notEqual(resolve({ id: "abc-123", whatsapp_session: null }), resolve({ id: "def-456", whatsapp_session: null }));

// Phone rendering: strip the suffix, and never show an empty string as a connected number.
assert.equal(phoneFromWahaId("94705864530@c.us"), "94705864530");
assert.equal(phoneFromWahaId("94705864530"), "94705864530");
assert.equal(phoneFromWahaId(undefined), null);
assert.equal(phoneFromWahaId(""), null);
// A lid id is not a phone number — leave it alone rather than half-stripping it into a fake number.
assert.equal(phoneFromWahaId("183344268587093@lid"), "183344268587093@lid");

console.log("ok — whatsapp session name resolution and phone rendering");
