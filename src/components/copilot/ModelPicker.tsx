"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderLogo } from "./ProviderLogo";
import { useModelInfo } from "@/lib/query/settings";

const TIER_HINTS = { fast: "Quick lookups", standard: "Everyday work", thinking: "Multi-step analysis" } as const;

/** What the route falls back to when the client sends no modelId — keep in step with the
 *  copilot route's `tier`, so the label always names the model that will actually run. */
const ROUTE_DEFAULT_TIER = "fast";

/**
 * Per-run model choice for the copilot, across every provider that has an API key configured.
 * Settings → Models still picks the provider the agents run on (WhatsApp replies, background
 * jobs); this only trades depth, cost and speed for the question being asked right now.
 *
 * The choice is not persisted: reading localStorage during the first render would make the
 * server and client markup disagree, and a per-session default is enough.
 */
export function ModelPicker({ value, onChange }: { value: string | null; onChange: (id: string) => void }) {
  const { data: info, isLoading } = useModelInfo();
  // A provider without a key would 401 on the first token — don't offer it.
  const providers = info?.providers.filter((provider) => provider.hasKey) ?? [];

  // Hold the row's width while the catalog loads rather than popping a control in beside the
  // send button.
  if (providers.length === 0) {
    return (
      <span className="shrink-0 px-2 py-1 text-xs text-muted-foreground" aria-hidden>
        {isLoading ? "…" : ""}
      </span>
    );
  }

  const all = providers.flatMap((provider) => provider.models.map((model) => ({ ...model, providerId: provider.id })));
  const home = providers.find((provider) => provider.id === info?.current.providerId) ?? providers[0];
  // Nothing chosen yet means the route's own default, on the business's own provider. Fall
  // through rather than trusting a tier to exist — an unresolved lookup renders as an empty picker.
  const active =
    all.find((model) => model.id === value) ??
    all.find((model) => model.providerId === home.id && model.tier === ROUTE_DEFAULT_TIER) ??
    all.find((model) => model.providerId === home.id) ??
    all[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Choose model"
          className="t-press inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ProviderLogo providerId={active.providerId} className="size-3.5 shrink-0" />
          <span className="max-w-28 truncate">{active.label}</span>
          <HugeiconsIcon icon={ArrowDown01Icon} size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuRadioGroup value={active.id} onValueChange={onChange}>
          {providers.map((provider, index) => (
            <div key={provider.id}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuLabel className="flex items-center gap-2 text-muted-foreground">
                <ProviderLogo providerId={provider.id} className="size-3.5 shrink-0" />
                {provider.label}
              </DropdownMenuLabel>
              {provider.models.map((model) => (
                <DropdownMenuRadioItem key={model.id} value={model.id} className="gap-2">
                  <span className="flex-1 truncate">{model.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{TIER_HINTS[model.tier]}</span>
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
