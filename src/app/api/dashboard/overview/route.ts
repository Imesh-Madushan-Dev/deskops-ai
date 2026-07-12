import { NextResponse } from "next/server";
import { getDashboardOverview } from "@/lib/db/dashboard";

export async function GET() {
  try { return NextResponse.json(await getDashboardOverview()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load dashboard" }, { status: 401 }); }
}
