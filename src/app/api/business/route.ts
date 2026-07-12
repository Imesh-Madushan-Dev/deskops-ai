import { NextResponse } from "next/server";
import { businessInputSchema, updateBusiness } from "@/lib/db/business";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = businessInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid business details." }, { status: 400 });
  try {
    return NextResponse.json(await updateBusiness(parsed.data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update business" }, { status: 400 });
  }
}
