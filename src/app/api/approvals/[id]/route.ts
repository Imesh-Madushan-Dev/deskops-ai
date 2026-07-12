import { NextResponse } from "next/server";
import { z } from "zod";
import { approveApproval, rejectApproval } from "@/lib/db/approvals";

const actionSchema = z.object({ action: z.enum(["approve", "reject"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = actionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  try {
    if (parsed.data.action === "approve") return NextResponse.json(await approveApproval(id));
    await rejectApproval(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to process approval" }, { status: 400 });
  }
}
