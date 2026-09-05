// Run: node src/lib/utils/invoice.check.ts
import assert from "node:assert/strict";
import { bumpInvoiceNumber, sameOrder } from "./invoice.ts";

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
