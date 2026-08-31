"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, SparklesIcon } from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModelInfo } from "@/lib/query/settings";

const TIERS = [
  { key: "fast", label: "Fast", hint: "Quick lookups" },
  { key: "standard", label: "Standard", hint: "Everyday work" },
  { key: "thinking", label: "Thinking", hint: "Multi-step analysis" },
] as const;

/** What the route falls back to when the client sends no modelId — keep in step with the
 *  copilot route's `tier`, so the label always names the model that will actually run. */
const ROUTE_DEFAULT_TIER = "thinking";

/**
 * Per-run model choice for the copilot, within the provider the owner picked in
 * Settings → Models — the provider is a billing/API-key decision and stays there; this only
 * trades depth against speed for the question being asked right now.
 *
 * The choice is not persisted: reading localStorage during the first render would make the
 * server and client markup disagree, and a per-session default is enough.
 */
export function ModelPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { data: info, isLoading } = useModelInfo();
  const provider = info?.providers.find((p) => p.id === info.current.providerId);

  // Hold the row's width while the catalog loads rather than popping a control in beside the
  // send button.
  if (!provider) {
    return (
      <span className="shrink-0 px-2 py-1 text-xs text-muted-foreground" aria-hidden>
        {isLoading ? "…" : ""}
      </span>
    );
  }

  // Nothing chosen yet means the route's own default. Fall through the tiers rather than
  // trusting one to exist — an unresolved lookup here is what renders as an empty picker.
  const active =
    provider.models.find((m) => m.id === value) ??
    provider.models.find((m) => m.tier === ROUTE_DEFAULT_TIER) ??
    provider.models.find((m) => m.tier === "standard") ??
    provider.models[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Choose model"
          className="t-press inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="max-w-28 truncate">{active.label}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup value={active.id} onValueChange={onChange}>
          {TIERS.map((tier, index) => {
            const models = provider.models.filter((model) => model.tier === tier.key);
            if (models.length === 0) return null;

            return (
              <div key={tier.key}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-muted-foreground">
                  {tier.label} <span className="font-normal opacity-70">· {tier.hint}</span>
                </DropdownMenuLabel>
                {models.map((model) => (
                  <DropdownMenuRadioItem key={model.id} value={model.id} className="gap-2">
                    <HugeiconsIcon icon={SparklesIcon} size={14} className="shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{model.label}</span>
                  </DropdownMenuRadioItem>
                ))}
              </div>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
