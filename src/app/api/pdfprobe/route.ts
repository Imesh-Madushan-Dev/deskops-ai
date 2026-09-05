import { NextResponse } from "next/server";
import { renderInvoicePdfBase64 } from "@/lib/invoice/pdf";
export async function GET() {
  try {
    const b64 = await renderInvoicePdfBase64({
      businessName: "Probe", currency: "LKR", number: "INV-0001", dateISO: new Date().toISOString(),
      billTo: { name: "X", address: "Y", phone: "1" },
      items: [{ description: "Tee", quantity: 1, unit_price: 3200, line_total: 3200 }],
      subtotal: 3200, tax: 0, total: 3200,
    });
    return NextResponse.json({ ok: true, bytes: Buffer.from(b64, "base64").length });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), stack: (e as Error)?.stack?.slice(0, 800) });
  }
}
