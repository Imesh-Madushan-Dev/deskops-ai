import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database";

export async function enqueueJob(input: { businessId: string; jobType: "process_message" | "daily_insight"; payload: Record<string, Json>; idempotencyKey: string; webhookEventId?: string }) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("jobs")
    .upsert(
      { business_id: input.businessId, job_type: input.jobType, payload: input.payload, idempotency_key: input.idempotencyKey, webhook_event_id: input.webhookEventId ?? null },
      { onConflict: "idempotency_key", ignoreDuplicates: true },
    );
  if (error) throw error;
}
