import { NextResponse } from "next/server";
import { EMBEDDING_MODEL_NAME, PROVIDER_CATALOG, providerHasKey, providerModels, resolveModelSelection, type ProviderId } from "@/lib/ai/provider";
import { getCurrentBusiness } from "@/lib/db/auth";

export async function GET() {
  try {
    const { supabase, business } = await getCurrentBusiness();
    const current = resolveModelSelection(business.settings);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: usage, error } = await supabase
      .from("model_usage")
      .select("provider,model,input_tokens,output_tokens")
      .eq("business_id", business.id)
      .gte("created_at", since);
    if (error) throw error;

    const byModel = new Map<string, { provider: string; model: string; requests: number; inputTokens: number; outputTokens: number }>();
    for (const row of usage ?? []) {
      const key = `${row.provider}/${row.model}`;
      const entry = byModel.get(key) ?? { provider: row.provider, model: row.model, requests: 0, inputTokens: 0, outputTokens: 0 };
      entry.requests += 1;
      entry.inputTokens += row.input_tokens;
      entry.outputTokens += row.output_tokens;
      byModel.set(key, entry);
    }
    const usageByModel = [...byModel.values()].sort((a, b) => b.requests - a.requests);

    return NextResponse.json({
      current,
      embeddingModel: EMBEDDING_MODEL_NAME,
      providers: (Object.keys(PROVIDER_CATALOG) as ProviderId[]).map((id) => ({
        id,
        label: PROVIDER_CATALOG[id].label,
        models: providerModels(id).map((model) => ({ id: model.id, label: model.label, tier: model.tier })),
        hasKey: providerHasKey(id),
      })),
      usage: {
        sinceDays: 30,
        requests: usageByModel.reduce((sum, u) => sum + u.requests, 0),
        inputTokens: usageByModel.reduce((sum, u) => sum + u.inputTokens, 0),
        outputTokens: usageByModel.reduce((sum, u) => sum + u.outputTokens, 0),
        byModel: usageByModel,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load model settings" }, { status: 500 });
  }
}
