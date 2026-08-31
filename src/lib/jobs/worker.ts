import "server-only";

import type { ModelMessage } from "ai";
import { createAdminClient } from "@/lib/supabase/admin";
import { runOrchestrator } from "@/lib/agents/orchestrator";
import { contactLabel } from "@/lib/utils/contact";
import { getBooksSummary } from "@/lib/db/ledger";
import { createApproval } from "@/lib/db/approvals";
import { enqueueJob } from "@/lib/jobs/enqueue";
import { sendWhatsappMessage } from "@/lib/waha/client";
import { sendInvoiceToCustomer } from "@/lib/invoice/send";
import { readAutoReply, readAutoInvoice } from "@/lib/db/settings";

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
    const supabase = createAdminClient();

    // Give the agent the running conversation + who it's talking to, so it remembers context
    // across messages and never asks an existing customer for their own number.
    const [{ data: conv }, { data: msgs }, { data: biz }] = await Promise.all([
      supabase.from("conversations").select("customer_id, customers(name, whatsapp_number)").eq("id", payload.conversationId).single(),
      supabase.from("messages").select("direction, body").eq("conversation_id", payload.conversationId).order("created_at").limit(30),
      supabase.from("businesses").select("whatsapp_session, settings").eq("id", job.business_id).single(),
    ]);
    const session = biz?.whatsapp_session ?? "default";
    const autoReply = readAutoReply(biz?.settings);
    const autoInvoice = readAutoInvoice(biz?.settings);

    // Drop the last row (the message we're answering — runOrchestrator appends it itself).
    const history: ModelMessage[] = (msgs ?? []).slice(0, -1).map((m) => ({ role: m.direction === "inbound" ? "user" : "assistant", content: m.body }));
    const whatsappStyle = [
      "You are replying to a customer on WhatsApp. Write like a warm, real shop assistant — not a robot.",
      "Formatting (WhatsApp, NOT markdown): use *single asterisks* for bold — never **double**. Use _underscores_ for italics.",
      "Keep messages short. Break them into a few short lines with a blank line between points, so it reads clean on a phone — never one dense block.",
      "Talk like a person, not a catalog. Say product names naturally ('the canvas tote', 'the black tee') — never copy formal catalog punctuation like em dashes (—) or SKU-style names into chat. No dashes as decoration.",
      "Don't repeat yourself. If you already said the price or asked a question, don't say it again in the next message. One question per message, max.",
      "After sending a product image with sendProductImage, the caption already says everything — reply with NOTHING (empty text) unless the customer asked something else that still needs an answer.",
      "Language: match the customer's LAST message exactly. English message → reply only in English. සිංහල message → reply only in සිංහල. Singlish mix → reply the same casual mixed way. Never switch to a different language than the one the customer just used.",
      autoInvoice
        ? "When you draft an invoice it is sent to the customer right away — tell them here is their quote."
        : "When you draft an invoice it must be confirmed by the shop owner first — so tell the customer their quote is being prepared and will be confirmed in a few minutes.",
    ].join("\n");
    const contextNote = conv?.customer_id
      ? `${whatsappStyle}\n\nYou are chatting with an existing customer "${contactLabel(conv.customers)}" (customer id ${conv.customer_id}). Never ask them for their WhatsApp number — use this customer id directly for any invoice.`
      : whatsappStyle;

    // A customer is waiting on WhatsApp — the fast tier, not whatever the owner picked for the copilot.
    const result = await runOrchestrator({ ...payload, history, contextNote, surface: "customer", tier: "fast", businessOverride: { businessId: job.business_id } });
    const reply = (await result.text).trim();

    // Auto-send invoices the agent just drafted, if the owner enabled it. The invoice body already
    // carries the customer-facing message (number + total), so when we send it we must NOT also send
    // the agent's free-text reply — that's what produced two near-identical messages.
    let invoiceSentThisRun = false;
    if (autoInvoice) {
      const { data: pending } = await supabase
        .from("approvals")
        .select("id, payload")
        .eq("business_id", job.business_id)
        .eq("conversation_id", payload.conversationId)
        .eq("action_type", "send_invoice")
        .eq("status", "pending");
      for (const appr of pending ?? []) {
        const p = appr.payload as { chatId: string; invoiceId: string; caption?: string; body: string };
        await supabase.from("invoices").update({ status: "sent", issued_at: new Date().toISOString() }).eq("id", p.invoiceId).eq("business_id", job.business_id).eq("status", "draft");
        const send = await sendInvoiceToCustomer({ session, chatId: p.chatId, invoiceId: p.invoiceId, businessId: job.business_id, caption: p.caption ?? p.body, fallbackBody: p.body });
        await supabase.from("messages").insert({ business_id: job.business_id, conversation_id: payload.conversationId, direction: "outbound", sender: "agent", body: send.recordedBody, provider_message_id: send.providerMessageId });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), awaiting_reply: false }).eq("id", payload.conversationId);
        await supabase.from("approvals").update({ status: "executed" }).eq("id", appr.id);
        invoiceSentThisRun = true;
      }
    }

    // The agent's conversational reply goes out only when we didn't just auto-send an invoice for it
    // (otherwise it duplicates the invoice message). Unless auto-reply is on, it queues for approval.
    if (reply && !invoiceSentThisRun) {
      if (autoReply) {
        const send = await sendWhatsappMessage(session, payload.chatId, reply);
        await supabase.from("messages").insert({ business_id: job.business_id, conversation_id: payload.conversationId, direction: "outbound", sender: "agent", body: reply, provider_message_id: send.sent ? send.providerMessageId : null });
        await supabase.from("conversations").update({ last_message_at: new Date().toISOString(), awaiting_reply: false }).eq("id", payload.conversationId);
      } else {
        await createApproval(
          { actionType: "send_message", conversationId: payload.conversationId, payload: { conversationId: payload.conversationId, chatId: payload.chatId, body: reply } },
          { businessId: job.business_id },
        );
      }
    }
    return;
  }

  if (job.job_type === "daily_insight") {
    const forDate = (job.payload as { forDate?: string }).forDate ?? new Date().toISOString().slice(0, 10);
    const from = `${forDate}T00:00:00.000Z`;
    const to = `${forDate}T23:59:59.999Z`;
    const summary = await getBooksSummary({ from, to }, { businessId: job.business_id });
    const supabase = createAdminClient();

    // Keep model_usage from growing unbounded: one row per agent call adds up fast. We only need it
    // for recent cost/usage reporting, so prune anything older than 90 days on the daily tick.
    // ponytail: 90-day retention; if you need long-term cost history, roll these up into a monthly
    // aggregate table before deleting instead of dropping them.
    const cutoff = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();
    await supabase.from("model_usage").delete().eq("business_id", job.business_id).lt("created_at", cutoff);

    const { error } = await supabase
      .from("daily_insights")
      .upsert(
        { business_id: job.business_id, for_date: forDate, summary: `Income ${summary.income}, expenses ${summary.expense}, net ${summary.net}.`, metrics: summary },
        { onConflict: "business_id,for_date" },
      );
    if (error) throw error;
  }
}
