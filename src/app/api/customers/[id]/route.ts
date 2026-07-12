import { NextResponse } from "next/server";
import { customerInputSchema, getCustomer, getCustomerHistory, updateCustomer } from "@/lib/db/customers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const [customer, history] = await Promise.all([getCustomer(id), getCustomerHistory(id)]);
    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    return NextResponse.json({ ...customer, ...history });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load customer" }, { status: 401 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = customerInputSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid customer details." }, { status: 400 });
  try {
    return NextResponse.json(await updateCustomer(id, parsed.data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update customer" }, { status: 400 });
  }
}
