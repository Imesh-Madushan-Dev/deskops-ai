import { NextResponse } from "next/server";
import { z } from "zod";
import { markReorderStatus } from "@/lib/db/inventory";

const statusSchema = z.object({ status: z.enum(["ordered", "received"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  try {
    const { productId, stockQty } = await markReorderStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true, productId, stockQty });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update reorder" }, { status: 400 });
  }
}
