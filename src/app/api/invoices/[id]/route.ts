import { NextResponse } from "next/server";
import { z } from "zod";
import { getInvoice, markInvoiceSent, recordSale, voidInvoice } from "@/lib/db/invoices";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const invoice = await getInvoice(id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load invoice" }, { status: 401 });
  }
}

const actionSchema = z.object({ action: z.enum(["send", "record_sale", "void"]) });

/** Owner-initiated actions taken directly in the dashboard — the human-in-the-loop step is the owner clicking this button. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  try {
    if (parsed.data.action === "send") await markInvoiceSent(id);
    if (parsed.data.action === "record_sale") await recordSale(id);
    if (parsed.data.action === "void") await voidInvoice(id);
    return NextResponse.json(await getInvoice(id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update invoice" }, { status: 400 });
  }
}
