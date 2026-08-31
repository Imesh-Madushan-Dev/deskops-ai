/**
 * The catalog invariant resolveModel depends on: every provider offers exactly one model per
 * tier, so "fast"/"standard"/"thinking" always resolve within whatever provider the owner picked.
 * Break it and a surface silently falls back to the wrong model instead of erroring.
 *
 * Run: bun run scripts/check-model-catalog.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// provider.ts is server-only; the catalog is a static literal, so read it out rather than
// standing up a Next server context just to see it.
const source = readFileSync(new URL("../src/lib/ai/provider.ts", import.meta.url), "utf8");
const catalog = source.slice(source.indexOf("export const PROVIDER_CATALOG"), source.indexOf("} as const satisfies"));

const providers = [...catalog.matchAll(/^ {2}(\w+): \{$/gm)].map((m) => m[1]);
assert.deepEqual(providers, ["google", "openai", "anthropic", "groq"], "provider set changed");

for (const [index, provider] of providers.entries()) {
  const start = catalog.indexOf(`  ${provider}: {`);
  const end = index + 1 < providers.length ? catalog.indexOf(`  ${providers[index + 1]}: {`) : catalog.length;
  const block = catalog.slice(start, end);

  const tiers = [...block.matchAll(/tier: "(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual([...tiers].sort(), ["fast", "standard", "thinking"], `${provider}: needs exactly one model per tier, got ${tiers.join()}`);

  const ids = [...block.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids.length, 3, `${provider}: every model needs an id`);
  for (const id of ids) assert.ok(id.length > 2, `${provider}: empty model id`);
  // A duplicate id costs the picker a whole tier: two entries collapse to one option and the
  // tier lookup finds nothing, which renders as an empty model selection.
  assert.equal(new Set(ids).size, 3, `${provider}: model ids must be unique, got ${ids.join()}`);

  const prices = [...block.matchAll(/usd(?:In|Out): ([\d.]+)/g)].map((m) => Number(m[1]));
  assert.equal(prices.length, 6, `${provider}: every model needs usdIn and usdOut for cost_usd`);
  for (const price of prices) assert.ok(price > 0, `${provider}: a zero price silently zeroes model_usage.cost_usd`);

  assert.ok(block.includes("envKey:"), `${provider}: missing envKey`);
}

console.log(`ok — ${providers.length} providers, one model per tier, all priced`);
