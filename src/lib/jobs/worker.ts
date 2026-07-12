import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { getBooksSummary } from "@/lib/db/ledger";
import { createApproval } from "@/lib/db/approvals";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { sendWhatsappMessage } from "@/lib/waha/client";
import { isAutoReplyEnabled } from "@/lib/db/settings";

const BATCH_SIZE = 10;

/** One daily_insight job per business per day — safe to call on every cron tick, the
 *  idempotency_key dedupes it so only the first call each day actually enqueues anything. */
export async function enqueueDailyInsightJobs() {
  const supabase = createAdminClient();
  const { data: businesses, error } = await supabase.from("businesses").select("id, timezone");
  if (error) throw error;
  const today = new Date().toISOString().slice(0, 10);
  for (const business of businesses ?? []) {
    await enqueueJob({
      businessId: business.id,
      jobType: "daily_insight",
      payload: { forDate: today },
      idempotencyKey: `daily_insight:${business.id}:${today}`,
    });
  }
}

export async function runJobWorker() {
  const supabase = createAdminClient();
  const { data: candidates, error } = await supabase
    .from("jobs")
    .select("id")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("created_at")
    .limit(BATCH_SIZE);
  if (error) throw error;

  const results = { processed: 0, failed: 0 };
  for (const { id } of candidates ?? []) {
    const claimed = await claimJob(id);
    if (!claimed) continue;
    try {
      await processJob(claimed);
      await supabase.from("jobs").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", id);
      results.processed += 1;
    } catch (err) {
      await supabase
        .from("jobs")
        .update({ status: "failed", attempts: claimed.attempts + 1, last_error: err instanceof Error ? err.message : "Unknown error" })
        .eq("id", id);
      results.failed += 1;
    }
  }
  return results;
}

async function claimJob(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("jobs").update({ status: "processing" }).eq("id", id).eq("status", "pending").select().maybeSingle();
  if (error) throw error;
  return data;
}

async function processJob(job: { business_id: string; job_type: string; payload: unknown }) {
  if (job.job_type === "process_message") {
    const payload = job.payload as { conversationId: string; chatId: string; message: string };
    const result = await runOrchestrator({ ...payload, businessOverride: { businessId: job.business_id } });
    const [text, steps] = await Promise.all([result.text, result.steps]);

    // An invoice draft always gates for owner approval (money) — don't also auto-send the text.
    const invoiceQueued = steps.some((step) => step.toolCalls.some((call) => call.toolName === "draftAndQueueInvoice"));
    const reply = text.trim();
    if (invoiceQueued || !reply) return;

    const supabase = createAdminClient();
    if (await isAutoReplyEnabled(job.business_id)) {
      const { data: biz } = await supabase.from("businesses").select("whatsapp_session").eq("id", job.business_id).single();
      const send = await sendWhatsappMessage(biz?.whatsapp_session ?? "default", payload.chatId, reply);
      await supabase.from("messages").insert({ business_id: job.business_id, conversation_id: payload.conversationId, direction: "outbound", sender: "agent", body: reply, provider_message_id: send.sent ? send.providerMessageId : null });
      await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), awaiting_reply: false }).eq("id", payload.conversationId);
    } else {
      await createApproval(
        { actionType: "send_message", conversationId: payload.conversationId, payload: { conversationId: payload.conversationId, chatId: payload.chatId, body: reply } },
        { businessId: job.business_id },
      );
    }
    return;
  }

  if (job.job_type === "daily_insight") {
    const forDate = (job.payload as { forDate?: string }).forDate ?? new Date().toISOString().slice(0, 10);
    const from = `${forDate}T00:00:00.000Z`;
    const to = `${forDate}T23:59:59.999Z`;
    const summary = await getBooksSummary({ from, to }, { businessId: job.business_id });
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("daily_insights")
      .upsert(
        { business_id: job.business_id, for_date: forDate, summary: `Income ${summary.income}, expenses ${summary.expense}, net ${summary.net}.`, metrics: summary },
        { onConflict: "business_id,for_date" },
      );
    if (error) throw error;
  }
}
