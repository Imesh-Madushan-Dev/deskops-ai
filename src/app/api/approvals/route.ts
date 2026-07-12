import { NextResponse } from "next/server";
import { listApprovals } from "@/lib/db/approvals";

export async function GET() {
  try {
    return NextResponse.json(await listApprovals("pending"));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load approvals" }, { status: 401 });
  }
}
