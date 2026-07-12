import { NextResponse } from "next/server";
import { createProduct, listProducts, productInputSchema } from "@/lib/db/products";

export async function GET() {
  try {
    return NextResponse.json(await listProducts());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load products" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = productInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid product details." }, { status: 400 });
  try {
    return NextResponse.json(await createProduct(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create product" }, { status: 400 });
  }
}
