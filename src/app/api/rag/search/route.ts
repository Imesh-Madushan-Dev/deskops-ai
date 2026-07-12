import { NextResponse } from "next/server";
import { z } from "zod";
import { retrieveContext } from "@/lib/rag/retrieve";

const searchSchema = z.object({ query: z.string().trim().min(1).max(500), matchCount: z.number().int().min(1).max(20).optional() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid search query." }, { status: 400 });
  try {
    return NextResponse.json(await retrieveContext(parsed.data.query, parsed.data.matchCount));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to search" }, { status: 400 });
  }
}
