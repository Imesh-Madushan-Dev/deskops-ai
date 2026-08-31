import { tool } from "ai";
import { z } from "zod";
import { getCurrentBusiness } from "@/lib/db/auth";
import { createApproval } from "@/lib/db/approvals";
import { createProduct, updateProduct, archiveProduct, adjustStock, productInputSchema } from "@/lib/db/products";
import { createCustomer, updateCustomer, customerInputSchema } from "@/lib/db/customers";
import { createInvoice, reviseInvoice, invoiceInputSchema, InvoicePaidError } from "@/lib/db/invoices";
import { createLedgerEntry, ledgerEntryInputSchema } from "@/lib/db/ledger";

/**
 * The OWNER surface: tools that write to the business itself.
 *
 * The counterpart of sales.ts, which is the customer surface. These must never be handed to a
 * conversation-bound run — that path executes with the service-role client on text a customer
 * wrote, so a tool here would be a prompt-injection route straight into the catalog and ledger.
 * buildToolset() enforces the split; scripts/check-tool-surfaces.ts asserts it.
 *
 * Every tool wraps a db/ function that already validates its input and scopes to the business
 * through RLS, so the db zod schemas are reused as tool schemas rather than restated — a second
 * copy of "price must be >= 0" is a copy that drifts.
 */

/**
 * Two fields need one narrowing before a model can see them. The db schemas accept "" on them so an empty form input coerces to null. As a function
 * declaration that becomes `anyOf` with `enum: [""]`, which Gemini rejects outright with a 400 —
 * and because every tool is declared in one request, one bad declaration fails the whole call.
 * A model omits a field rather than sending "", so the tool-facing shape drops that branch.
 * Verified against the live API by scripts/check-tool-schemas.mjs.
 */
const productToolSchema = productInputSchema.extend({
  imageUrl: z.string().trim().url().max(2000).nullish(),
});
const customerToolSchema = customerInputSchema.extend({
  email: z.string().trim().email().nullish(),
});

export function createOwnerTools() {
  /* ── Reads the write tools depend on ──────────────────────────────────
     Nothing else can resolve a customer by name or find an invoice number, so without these
     the agent has no way to name the row it is about to change. */

  const findCustomers = tool({
    description:
      "Search customers by name, phone, email or WhatsApp number. Use this to get a customer id before invoicing or updating them. Omit `query` to list recent customers.",
    inputSchema: z.object({ query: z.string().optional().describe("Name, phone, email or number. Omit to list recent customers.") }),
    execute: async ({ query }) => {
      const { supabase, business } = await getCurrentBusiness();
      let builder = supabase
        .from("customers")
        .select("id, name, whatsapp_number, phone, email, address")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false });
      // Strip PostgREST filter syntax characters before interpolating into .or().
      const safe = query?.replace(/[,()]/g, " ").trim();
      builder = safe
        ? builder.or(`name.ilike.%${safe}%,whatsapp_number.ilike.%${safe}%,phone.ilike.%${safe}%,email.ilike.%${safe}%`).limit(10)
        : builder.limit(25);
      const { data, error } = await builder;
      if (error) throw error;
      return { matches: data };
    },
  });

  const findInvoices = tool({
    description:
      "List invoices with their id, number, status and total. Use this to get an invoice id before revising, voiding or marking one paid.",
    inputSchema: z.object({
      status: z.enum(["draft", "sent", "paid", "void"]).optional(),
      customerId: z.string().uuid().optional(),
      number: z.string().optional().describe("An invoice number such as INV-0003."),
    }),
    execute: async ({ status, customerId, number }) => {
      const { supabase, business } = await getCurrentBusiness();
      let builder = supabase
        .from("invoices")
        .select("id, number, status, subtotal, tax, total, created_at, customers(name)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (status) builder = builder.eq("status", status);
      if (customerId) builder = builder.eq("customer_id", customerId);
      if (number) builder = builder.eq("number", number.trim().toUpperCase());
      const { data, error } = await builder;
      if (error) throw error;
      return { currency: business.currency, matches: data };
    },
  });

  /* ── Direct writes ────────────────────────────────────────────────────
     Internal and reversible. The owner asked for these in the turn that triggered them, so an
     approval tap would add friction without adding safety. */

  const addProduct = tool({
    description: "Add a new product to the catalog. Ask for the price before calling this — never guess one.",
    inputSchema: productToolSchema,
    execute: async (input) => {
      const product = await createProduct(input);
      return { created: true as const, id: product.id, name: product.name, price: product.price, stockQty: product.stock_qty };
    },
  });

  const editProduct = tool({
    description:
      "Change fields on an existing product (price, name, sku, reorder level, image, category, supplier). Only pass the fields that change. To change stock use adjustProductStock instead, so the movement is recorded.",
    inputSchema: z.object({ productId: z.string().uuid(), changes: productToolSchema.partial() }),
    execute: async ({ productId, changes }) => {
      const product = await updateProduct(productId, changes);
      return { updated: true as const, id: product.id, name: product.name, price: product.price };
    },
  });

  const adjustProductStock = tool({
    description:
      "Add or remove stock for a product, recording the movement. Use a positive delta for a restock and a negative one for a correction. Stock cannot go below zero.",
    inputSchema: z.object({
      productId: z.string().uuid(),
      delta: z.number().int().describe("Positive to add stock, negative to remove."),
      reason: z.enum(["restock", "adjustment"]),
    }),
    execute: async ({ productId, delta, reason }) => {
      try {
        await adjustStock(productId, delta, reason);
        return { adjusted: true as const, delta };
      } catch (error) {
        // adjustStock throws this rather than clamping; the owner needs the real reason.
        if (error instanceof Error && error.message.includes("below zero")) {
          return { adjusted: false as const, note: "That would take stock below zero. Check the current quantity first." };
        }
        throw error;
      }
    },
  });

  const archiveProductTool = tool({
    description: "Archive a product so it stops appearing in the catalog. This is a soft delete — nothing is destroyed.",
    inputSchema: z.object({ productId: z.string().uuid() }),
    execute: async ({ productId }) => {
      await archiveProduct(productId);
      return { archived: true as const };
    },
  });

  const addCustomer = tool({
    description: "Create a customer record. A WhatsApp number is required — it is how conversations are matched to a customer.",
    inputSchema: customerToolSchema,
    execute: async (input) => {
      const customer = await createCustomer(input);
      return { created: true as const, id: customer.id, name: customer.name };
    },
  });

  const editCustomer = tool({
    description: "Update a customer's details. Only pass the fields that change.",
    inputSchema: z.object({ customerId: z.string().uuid(), changes: customerToolSchema.partial() }),
    execute: async ({ customerId, changes }) => {
      const customer = await updateCustomer(customerId, changes);
      return { updated: true as const, id: customer.id, name: customer.name };
    },
  });

  const createDraftInvoice = tool({
    description:
      "Create a DRAFT invoice. It is not sent to anyone — the owner sends it from the invoice page. Look up each product with checkStock first and use its real price; never invent a price or a total.",
    inputSchema: invoiceInputSchema,
    execute: async (input) => {
      const invoice = await createInvoice(input);
      // Totals come from calculateInvoiceTotals inside createInvoice, so echo those back rather
      // than letting the model restate arithmetic it did itself.
      return { created: true as const, id: invoice.id, number: invoice.number, subtotal: invoice.subtotal, tax: invoice.tax, total: invoice.total, status: invoice.status };
    },
  });

  const reviseDraftInvoice = tool({
    description:
      "Replace the items on an unpaid invoice and recompute its totals, keeping the same invoice number. Pass the FULL corrected item list, not just the change.",
    inputSchema: z.object({ invoiceId: z.string().uuid(), items: invoiceInputSchema.shape.items }),
    execute: async ({ invoiceId, items }) => {
      try {
        const invoice = await reviseInvoice(invoiceId, items);
        return { revised: true as const, number: invoice.number, total: invoice.total };
      } catch (error) {
        if (error instanceof InvoicePaidError) {
          return { revised: false as const, note: "That invoice is already paid, so it cannot be changed. A refund or correction has to be handled manually." };
        }
        throw error;
      }
    },
  });

  const recordLedgerEntry = tool({
    description:
      "Record an income or expense in the books. Use this for costs the owner reports (rent, stock purchase, fuel) — sales from invoices are recorded automatically when an invoice is paid, so never add those here.",
    inputSchema: ledgerEntryInputSchema,
    execute: async (input) => {
      const entry = await createLedgerEntry(input);
      return { recorded: true as const, id: entry.id, entryType: entry.entry_type, amount: entry.amount, category: entry.category };
    },
  });

  /* ── Approval-gated ───────────────────────────────────────────────────
     Money-moving, so per the architecture guardrail these queue for the owner's tap instead of
     applying. The approvals table already knows how to execute each one. */

  const requestMarkInvoicePaid = tool({
    description:
      "Queue an invoice to be marked paid. This does NOT mark it paid — it creates an approval the owner taps, which then records the sale and the ledger entry. Tell the owner it is waiting for their approval.",
    inputSchema: z.object({ invoiceId: z.string().uuid() }),
    execute: async ({ invoiceId }) => {
      await createApproval({ actionType: "mark_invoice_paid", payload: { invoiceId } });
      return { status: "awaiting_approval" as const, note: "Queued in Approvals. It is not paid until you approve it." };
    },
  });

  const requestVoidInvoice = tool({
    description:
      "Queue an invoice to be voided. This does NOT void it — it creates an approval the owner taps. A paid invoice cannot be voided.",
    inputSchema: z.object({ invoiceId: z.string().uuid() }),
    execute: async ({ invoiceId }) => {
      await createApproval({ actionType: "void_invoice", payload: { invoiceId } });
      return { status: "awaiting_approval" as const, note: "Queued in Approvals. The invoice stays as it is until you approve it." };
    },
  });

  const requestReorder = tool({
    description:
      "Queue a restock order for a product. This does NOT order anything — it creates an approval the owner taps.",
    inputSchema: z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1) }),
    execute: async ({ productId, quantity }) => {
      await createApproval({ actionType: "reorder", payload: { productId, quantity } });
      return { status: "awaiting_approval" as const, note: "Queued in Approvals. Nothing is ordered until you approve it." };
    },
  });

  return {
    findCustomers,
    findInvoices,
    addProduct,
    editProduct,
    adjustProductStock,
    archiveProduct: archiveProductTool,
    addCustomer,
    editCustomer,
    createDraftInvoice,
    reviseDraftInvoice,
    recordLedgerEntry,
    requestMarkInvoicePaid,
    requestVoidInvoice,
    requestReorder,
  };
}
