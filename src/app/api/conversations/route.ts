import { NextResponse } from "next/server";
import { listConversations } from "@/lib/db/conversations";

export async function GET() {
  try {
    return NextResponse.json(await listConversations());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load conversations" }, { status: 401 });
  }
}
