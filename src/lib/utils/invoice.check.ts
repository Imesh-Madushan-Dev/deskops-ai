// Run: node src/lib/utils/invoice.check.ts
import assert from "node:assert/strict";
import { bumpInvoiceNumber, sameOrder, statedByCustomer } from "./invoice.ts";

assert.equal(bumpInvoiceNumber(null), "INV-0001");
assert.equal(bumpInvoiceNumber("INV-0001"), "INV-0002");
assert.equal(bumpInvoiceNumber("INV-0009"), "INV-0010");
// The regression: 3 invoices exist but the middle one was deleted with its customer. Numbering off
// the highest (0003) must not reissue 0003 the way count+1 did.
assert.equal(bumpInvoiceNumber("INV-0003"), "INV-0004");

const tee = { description: "Classic Tee - Black", quantity: 1, unitPrice: 3200 };
const mug = { description: "Ceramic Mug", quantity: 2, unitPrice: 900 };
assert.equal(sameOrder([tee], [{ ...tee, description: " classic tee - black " }]), true, "case/space insensitive");
assert.equal(sameOrder([tee, mug], [mug, tee]), true, "line order irrelevant");
assert.equal(sameOrder([tee], [{ ...tee, quantity: 2 }]), false, "different quantity is a new order");
assert.equal(sameOrder([tee], [{ ...tee, unitPrice: 2900 }]), false, "different price is a new order");
assert.equal(sameOrder([tee], [tee, mug]), false, "added line is a new order");

console.log("invoice helpers ok");

// The Bill To regression: the agent was never told a city, but saved "Colombo" and invoiced it.
const chat = "අම්මටසිරි එක මරු ද\nදාමු\nImesh Madushan";
assert.equal(statedByCustomer(chat, "Imesh Madushan", "text"), true, "name they typed");
assert.equal(statedByCustomer(chat, "imesh  madushan", "text"), true, "re-cased/re-spaced");
assert.equal(statedByCustomer(chat, "Colombo", "text"), false, "invented address is rejected");
assert.equal(statedByCustomer(chat, "94741020250", "phone"), false, "their WhatsApp number is not a stated phone");
assert.equal(statedByCustomer("call me on 077 102 0250", "0771020250", "phone"), true, "digits ignore spacing");
assert.equal(statedByCustomer("Pitigala, Galle", "Galle", "text"), true, "one word of the address is enough");

console.log("billing detail guard ok");
