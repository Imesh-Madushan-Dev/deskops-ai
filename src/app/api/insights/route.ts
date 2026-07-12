import { NextResponse } from "next/server";
import { getDailyInsight } from "@/lib/db/insights";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  try {
    return NextResponse.json(await getDailyInsight(date));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load insight" }, { status: 401 });
  }
}
