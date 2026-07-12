import { NextResponse } from "next/server";
import { getBooksSummary } from "@/lib/db/ledger";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = new Date();
  const from = url.searchParams.get("from") ?? new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const to = url.searchParams.get("to") ?? now.toISOString();
  try {
    return NextResponse.json(await getBooksSummary({ from, to }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load report" }, { status: 401 });
  }
}
