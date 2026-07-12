import { NextResponse } from "next/server";
import { createLedgerEntry, ledgerEntryInputSchema, listLedgerEntries } from "@/lib/db/ledger";

export async function GET() {
  try {
    return NextResponse.json(await listLedgerEntries());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load books" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = ledgerEntryInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid ledger entry." }, { status: 400 });
  try {
    return NextResponse.json(await createLedgerEntry(parsed.data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to add ledger entry" }, { status: 400 });
  }
}
