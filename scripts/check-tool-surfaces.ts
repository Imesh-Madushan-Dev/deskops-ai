/**
 * The one piece of logic in the tool layer that must not silently regress.
 *
 * WhatsApp runs execute with the service-role client (getCurrentBusiness honours
 * businessOverride, which returns the admin client and bypasses RLS) and are driven by text a
 * customer wrote. If an owner write tool ever reaches that surface, a customer message becomes a
 * prompt-injection route into the catalog and the ledger.
 *
 * Run: bun run scripts/check-tool-surfaces.ts
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The tool modules are server-only and open Supabase clients at import time, so read the source
// rather than standing up a request context just to enumerate tool names.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** `const someTool = tool({` and the keys of the returned object. */
function toolNames(source: string): string[] {
  const declared = [...source.matchAll(/const (\w+) = tool\(\{/g)].map((m) => m[1]);
  assert.ok(declared.length > 0, "no tools found — did the tool() call shape change?");
  return declared;
}

const ownerTools = toolNames(read("src/lib/tools/owner.ts"));
const salesTools = toolNames(read("src/lib/tools/sales.ts"));
const index = read("src/lib/tools/index.ts");

// 1. The split exists and is keyed on the surface, not on holding a conversation id.
assert.match(index, /surface === "customer"/, "buildToolset no longer branches on surface");
assert.match(index, /createOwnerTools\(\)/, "owner tools are not wired in");

// 2. The customer branch must not reach createOwnerTools. Compare the text of the branch that
//    returns for the customer surface against the owner factory.
const customerBranch = index.slice(index.indexOf('surface === "customer"'), index.lastIndexOf("return {"));
assert.ok(
  !customerBranch.includes("createOwnerTools"),
  "createOwnerTools is reachable from the customer surface — a customer message could write to the business",
);

// 3. Owner tools carry no outbound capability: nothing on the owner surface may message a
//    customer, because that would skip the approval gate the architecture doc requires.
for (const forbidden of ["sendProductImage", "escalateToOwner", "draftAndQueueInvoice"]) {
  assert.ok(!ownerTools.includes(forbidden), `${forbidden} must stay on the customer surface only`);
}

// 4. Owner writes and sales tools are disjoint sets, so neither file can quietly absorb the other.
const overlap = ownerTools.filter((name) => salesTools.includes(name));
assert.deepEqual(overlap, [], `tools defined on both surfaces: ${overlap.join()}`);

// 5. Every money-moving owner tool queues an approval rather than acting. These are the three
//    the architecture doc gates; a direct call here would move money with no owner tap.
const owner = read("src/lib/tools/owner.ts");
for (const gated of ["requestMarkInvoicePaid", "requestVoidInvoice", "requestReorder"]) {
  assert.ok(ownerTools.includes(gated), `${gated} is missing from the owner surface`);
  const body = owner.slice(owner.indexOf(`const ${gated} = tool({`));
  const execute = body.slice(0, body.indexOf("  });"));
  assert.match(execute, /createApproval\(/, `${gated} must queue an approval, not act directly`);
}

// 6. No tool schema may reach the model with an empty-string literal in a union. The db schemas
//    use `.or(z.literal(""))` so an empty form field coerces to null; as a function declaration
//    that becomes anyOf + enum:[""], which Gemini rejects with a 400 - and since every tool is
//    declared in one request, one bad schema breaks every call. owner.ts narrows those two fields
//    into productToolSchema / customerToolSchema. Confirmed live by scripts/check-tool-schemas.mjs.
for (const raw of ["productInputSchema", "customerInputSchema"]) {
  for (const usage of [`inputSchema: ${raw}`, `changes: ${raw}.partial()`, `items: ${raw}.`]) {
    assert.ok(
      !owner.includes(usage),
      `${raw} is handed to a model as-is ("${usage}"). It contains .or(z.literal("")), which Gemini rejects with a 400 and that fails every tool call. Use the narrowed *ToolSchema.`,
    );
  }
}
assert.ok(owner.includes("productToolSchema") && owner.includes("customerToolSchema"), "the narrowed tool schemas are gone");

console.log(
  `ok — ${ownerTools.length} owner tools, ${salesTools.length} customer tools, surfaces disjoint, money actions gated`,
);
