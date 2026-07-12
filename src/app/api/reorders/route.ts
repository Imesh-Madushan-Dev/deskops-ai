import { NextResponse } from "next/server";
import { createReorder, listReorders, reorderInputSchema } from "@/lib/db/inventory";

export async function GET() {
  try {
    return NextResponse.json(await listReorders());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load reorders" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reorderInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid reorder details." }, { status: 400 });
  try {
    return NextResponse.json(await createReorder(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create reorder" }, { status: 400 });
  }
}
