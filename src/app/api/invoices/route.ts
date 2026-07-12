import { NextResponse } from "next/server";
import { createInvoice, invoiceInputSchema, listInvoices } from "@/lib/db/invoices";

export async function GET() {
  try {
    return NextResponse.json(await listInvoices());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load invoices" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = invoiceInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invoice details." }, { status: 400 });
  try {
    return NextResponse.json(await createInvoice(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create invoice" }, { status: 400 });
  }
}
