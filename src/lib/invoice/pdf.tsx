import "server-only";

// The "takumi-pdf" bare specifier resolves to the Vite entry under Turbopack, which imports the
// wasm with a `?url` query the bundler cannot honour and fails the build. The package ships a
// dedicated Next entry — use it explicitly.
import { render } from "takumi-pdf/next";
import { InvoiceMinimalDocument } from "@/components/pdf/blocks/invoice-minimal/invoice-minimal";
import type { InvoiceMinimalData } from "@/components/pdf/blocks/invoice-minimal/invoice-minimal.types";
import { professionalTheme } from "@/lib/pdf-themes/professional";

/** Same purple as the dashboard's btn-purple. */
const BRAND = "#6d28d9";

type InvoicePdfInput = {
  businessName: string;
  currency: string;
  number: string;
  dateISO: string;
  billTo?: { name?: string | null; address?: string | null; phone?: string | null };
  items: { description: string; quantity: number; unit_price: number; line_total: number }[];
  subtotal: number;
  tax: number;
  total: number;
};

/** Renders the invoice to a PDF and returns it base64-encoded (no data: prefix) so it goes straight
 *  into WAHA's sendFile `data` field — no bucket, no hosting, nothing to clean up. */
export async function renderInvoicePdfBase64(input: InvoicePdfInput): Promise<string> {
  const date = new Date(input.dateISO).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const data: InvoiceMinimalData = {
    currency: input.currency,
    invoiceNumber: input.number,
    invoiceDate: date,
    // Nothing in the schema carries payment terms, so no due date is invented and the empty
    // Payment/GST rows drop out of the details block rather than rendering as bare labels.
    dueDate: "",
    companyName: input.businessName,
    subtitle: "Invoice",
    companyAddress: "",
    companyEmail: "",
    billTo: {
      name: input.billTo?.name ?? "",
      address: input.billTo?.address ?? "",
      email: "",
      phone: input.billTo?.phone ?? "",
    },
    items: input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
    })),
    summary: { subtotal: input.subtotal, tax: input.tax, total: input.total },
    paymentTerms: { dueDate: "", method: "", gst: "" },
    notes: `Thank you for your order · All amounts in ${input.currency}`,
  };

  // The stock theme is near-black; use the product's purple so the document looks like the app.
  const theme = { ...professionalTheme, colors: { ...professionalTheme.colors, primary: BRAND } };
  const bytes = await render(<InvoiceMinimalDocument data={data} theme={theme} />, {});
  return Buffer.from(bytes).toString("base64");
}
