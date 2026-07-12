import { NextResponse } from "next/server";
import { createCustomer, customerInputSchema, listCustomers } from "@/lib/db/customers";

export async function GET() {
  try {
    return NextResponse.json(await listCustomers());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load customers" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = customerInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid customer details." }, { status: 400 });
  try {
    return NextResponse.json(await createCustomer(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create customer" }, { status: 400 });
  }
}
