/**
 * The model writes chat-UI markdown; WhatsApp speaks a smaller dialect where ** is literal and
 * a leading * means bold. Getting this wrong puts stray asterisks in front of a paying customer,
 * so the conversion is worth a check.
 *
 * Run: bun run scripts/check-whatsapp-text.ts
 */
import assert from "node:assert/strict";
import { toWhatsappText } from "../src/lib/waha/text";

assert.equal(toWhatsappText("**Classic Tee** is 3200"), "*Classic Tee* is 3200");
assert.equal(toWhatsappText("***both***"), "*both*");
assert.equal(toWhatsappText("# Heading\nbody"), "Heading\nbody");
// A list marker is the dangerous one: "* item" would render as an unclosed bold run.
assert.equal(toWhatsappText("- one\n- two"), "• one\n• two");
assert.equal(toWhatsappText("* one\n+ two"), "• one\n• two");
assert.equal(toWhatsappText("see [our shop](https://x.co)"), "see our shop (https://x.co)");
assert.equal(toWhatsappText("a\n\n\n\nb"), "a\n\nb");
assert.equal(toWhatsappText("```\ncode\n```"), "code");
// Sinhala and single-asterisk bold must survive untouched.
assert.equal(toWhatsappText("*ලස්සනයි*"), "*ලස්සනයි*");
assert.equal(toWhatsappText("  padded  "), "padded");

console.log("ok — whatsapp text conversion");
