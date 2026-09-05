/**
 * The invoice PDF is rendered by a WASM renderer and sent straight to a customer — if it throws or
 * emits something that is not a PDF, the fallback silently ships plain text instead.
 *
 * Run: bun run scripts/check-invoice-pdf.tsx
 */
import assert from "node:assert/strict";
// The app uses "takumi-pdf/next", whose wasm is inlined by the bundler and so cannot run outside
// one. This check runs under bun, where the bare specifier picks a Windows-broken entry — hence
// the node entry by path. Types come from takumi-pdf-node.d.ts.
import { render } from "../node_modules/takumi-pdf/bundlers/node.mjs";
import { InvoiceMinimalDocument } from "../src/components/pdf/blocks/invoice-minimal/invoice-minimal";
import type { InvoiceMinimalData } from "../src/components/pdf/blocks/invoice-minimal/invoice-minimal.types";

const data: InvoiceMinimalData = {
  currency: "LKR",
  invoiceNumber: "INV-0001",
  invoiceDate: "5 Sept 2026",
  dueDate: "",
  companyName: "Iconnix",
  subtitle: "Invoice",
  companyAddress: "",
  companyEmail: "",
  billTo: { name: "Imesh", address: "Pitigala, Galle", email: "", phone: "94741020250" },
  items: [{ description: "Classic Tee - Black", quantity: 1, unitPrice: 3200 }],
  summary: { subtotal: 3200, tax: 0, total: 3200 },
  paymentTerms: { dueDate: "", method: "", gst: "" },
  notes: "All amounts in LKR.",
};

const bytes = await render(<InvoiceMinimalDocument data={data} />, {});
const buf = Buffer.from(bytes);
// A PDF always starts with %PDF- and ends with %%EOF; anything else means we'd ship a broken file.
assert.equal(buf.subarray(0, 5).toString(), "%PDF-", "output is not a PDF");
assert.ok(buf.includes(Buffer.from("%%EOF")), "PDF has no EOF marker");
assert.ok(buf.length > 1000, `PDF suspiciously small: ${buf.length} bytes`);

// A one-item invoice must not spill onto a second, near-empty page.
const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
assert.equal(pages, 1, `expected 1 page, got ${pages}`);

console.log(`ok — invoice PDF renders, 1 page (${buf.length} bytes)`);
