// Needs a live GEMINI_API_KEY and spends a little quota, so it is run by hand after a tool
// schema changes rather than on every build. scripts/check-tool-surfaces.ts carries the offline
// guard for the specific pattern this caught.
//
// Run: node scripts/check-tool-schemas.mjs
//
// owner.ts reuses the db zod schemas as tool inputSchemas. Those contain unions
// (`.or(z.literal(""))`) and a transform, which Gemini's function-declaration converter does not
// always accept — that would be a 400 on every copilot run that carries these tools.
// Send the real schemas to the real API and find out.
import { createGoogle } from "@ai-sdk/google";
import { generateText, tool } from "ai";
import { z } from "zod";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^["']|["']$/g, "")]),
);
const google = createGoogle({ apiKey: env.GEMINI_API_KEY });

// Copied verbatim from src/lib/db/{products,customers,invoices,ledger}.ts.
const productInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sku: z.string().trim().max(60).optional().nullable(),
  price: z.number().min(0),
  cost: z.number().min(0).optional().nullable(),
  stockQty: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  imageUrl: z.string().trim().url().max(2000).optional().nullable().or(z.literal("").transform(() => null)),
  categoryName: z.string().trim().max(80).optional().nullable(),
  supplierName: z.string().trim().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
});
const customerInputSchema = z.object({
  name: z.string().trim().max(120).optional().nullable(),
  whatsappNumber: z.string().trim().min(5).max(20),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
});
const invoiceItemInputSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  description: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});
const invoiceInputSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  taxRate: z.number().min(0).max(1).default(0),
  items: z.array(invoiceItemInputSchema).min(1),
});
const ledgerEntryInputSchema = z.object({
  entryType: z.enum(["income", "expense"]),
  amount: z.number().min(0),
  category: z.string().trim().min(1).max(80),
  occurredAt: z.string().datetime().optional(),
});

// The tool-facing narrowings from owner.ts.
const productToolSchema = productInputSchema.extend({ imageUrl: z.string().trim().url().max(2000).nullish() });
const customerToolSchema = customerInputSchema.extend({ email: z.string().trim().email().nullish() });

const cases = {
  addProduct: productToolSchema,
  editProduct: z.object({ productId: z.string().uuid(), changes: productToolSchema.partial() }),
  addCustomer: customerToolSchema,
  editCustomer: z.object({ customerId: z.string().uuid(), changes: customerToolSchema.partial() }),
  createDraftInvoice: invoiceInputSchema,
  reviseDraftInvoice: z.object({ invoiceId: z.string().uuid(), items: invoiceInputSchema.shape.items }),
  recordLedgerEntry: ledgerEntryInputSchema,
};

let failures = 0;
for (const [name, inputSchema] of Object.entries(cases)) {
  try {
    // One tool at a time, so a rejection names the schema that caused it.
    await generateText({
      model: google("gemini-3.6-flash"),
      tools: { [name]: tool({ description: `Test declaration for ${name}`, inputSchema, execute: async () => ({ ok: true }) }) },
      prompt: "Reply with the single word: ready. Do not call any tool.",
      maxRetries: 0,
    });
    console.log(`${name.padEnd(20)} accepted`);
  } catch (e) {
    failures++;
    const status = e?.statusCode ?? e?.lastError?.statusCode ?? "?";
    console.log(`${name.padEnd(20)} REJECTED (${status}): ${String(e.message).slice(0, 220).replace(/\n/g, " ")}`);
  }
}
console.log(failures ? `\n${failures} schema(s) rejected` : "\nall owner tool schemas accepted by Gemini");
