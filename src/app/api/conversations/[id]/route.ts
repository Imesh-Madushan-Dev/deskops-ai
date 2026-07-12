import { NextResponse } from "next/server";
import { getConversation, outboundMessageSchema, recordOwnerMessage, setConversationStatus } from "@/lib/db/conversations";
import { z } from "zod";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const conversation = await getConversation(id);
    if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    return NextResponse.json(conversation);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load conversation" }, { status: 401 });
  }
}

/** Owner replying directly from the dashboard (not the AI agent) skips the approval gate — the owner IS the human in the loop here. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = outboundMessageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  try {
    return NextResponse.json(await recordOwnerMessage(id, parsed.data.body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send message" }, { status: 400 });
  }
}

const statusSchema = z.object({ status: z.enum(["open", "snoozed", "closed"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  try {
    await setConversationStatus(id, parsed.data.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update conversation" }, { status: 400 });
  }
}
