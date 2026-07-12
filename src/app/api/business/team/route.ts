import { NextResponse } from "next/server";
import { listTeamMembers } from "@/lib/db/business";

export async function GET() {
  try {
    return NextResponse.json(await listTeamMembers());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load team" }, { status: 401 });
  }
}
