import { NextResponse } from "next/server";
import { z } from "zod";
import { adjustStock } from "@/lib/db/products";
import { listLowStock, listStockMovements } from "@/lib/db/inventory";

export async function GET() {
  try {
    const [lowStock, movements] = await Promise.all([listLowStock(), listStockMovements()]);
    return NextResponse.json({ lowStock, movements });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load inventory" }, { status: 401 });
  }
}

const adjustSchema = z.object({ productId: z.string().uuid(), delta: z.number().int().refine((n) => n !== 0), reason: z.enum(["restock", "adjustment"]) });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = adjustSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid stock adjustment." }, { status: 400 });
  try {
    await adjustStock(parsed.data.productId, parsed.data.delta, parsed.data.reason);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to adjust stock" }, { status: 400 });
  }
}
