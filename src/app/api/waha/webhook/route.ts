import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWahaSignature } from "@/lib/waha/verify";
import { enqueueJob } from "@/lib/jobs/enqueue";

/** WAHA's inbound webhook shape: { event, session, payload: { id, from, body } } for text messages.
 *  See https://waha.devlike.pro/docs/how-to/webhooks/ — adjust if your WAHA version differs. */
const wahaEventSchema = z.object({
  event: z.string(),
  session: z.string(),
  payload: z.object({ id: z.string(), from: z.string(), body: z.string().optional() }),
});

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature") ?? request.headers.get("x-waha-signature");
  if (!verifyWahaSignature(rawBody, signature)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const parsed = wahaEventSchema.safeParse(JSON.parse(rawBody));
  if (!parsed.success) return NextResponse.json({ ok: true }); // Unrecognized event shape — ack and ignore.
  const { event, session, payload } = parsed.data;
  if (event !== "message" || !payload.body) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();

  const { data: business, error: businessError } = await supabase.from("businesses").select("id").eq("whatsapp_session", session).maybeSingle();
  if (businessError) throw businessError;
  if (!business) return NextResponse.json({ ok: true }); // Unknown session — nothing to route to.

  const { data: existingEvent, error: findEventError } = await supabase
    .from("webhook_events")
    .select("id, processed_at")
    .eq("provider", "waha")
    .eq("external_id", payload.id)
    .maybeSingle();
  if (findEventError) throw findEventError;
  if (existingEvent?.processed_at) return NextResponse.json({ ok: true }); // Already processed — WAHA redelivered it.

  let webhookEventId: string;
  if (existingEvent) {
    webhookEventId = existingEvent.id;
  } else {
    const { data, error: insertError } = await supabase.from("webhook_events").insert({ provider: "waha", external_id: payload.id, payload: parsed.data }).select("id").single();
    if (insertError) throw insertError;
    webhookEventId = data.id;
  }

  const whatsappNumber = payload.from.replace(/@c\.us$/, "");
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .upsert({ business_id: business.id, whatsapp_number: whatsappNumber }, { onConflict: "business_id,whatsapp_number" })
    .select("id")
    .single();
  if (customerError) throw customerError;

  const { data: conversation, error: findConvError } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", business.id)
    .eq("customer_id", customer.id)
    .eq("status", "open")
    .maybeSingle();
  if (findConvError) throw findConvError;

  const conversationId = conversation?.id ?? (await createConversation(supabase, business.id, customer.id));

  const { error: messageError } = await supabase
    .from("messages")
    .upsert({ business_id: business.id, conversation_id: conversationId, direction: "inbound", sender: "customer", body: payload.body, provider_message_id: payload.id }, { onConflict: "business_id,provider_message_id" });
  if (messageError) throw messageError;
  await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);

  await enqueueJob({
    businessId: business.id,
    jobType: "process_message",
    payload: { conversationId, chatId: payload.from, message: payload.body },
    idempotencyKey: `process_message:${payload.id}`,
    webhookEventId,
  });

  await supabase.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", webhookEventId);

  return NextResponse.json({ ok: true });
}

async function createConversation(supabase: ReturnType<typeof createAdminClient>, businessId: string, customerId: string) {
  const { data, error } = await supabase.from("conversations").insert({ business_id: businessId, customer_id: customerId }).select("id").single();
  if (error) throw error;
  return data.id as string;
}
