"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ShieldIcon,
  CheckmarkCircle02Icon,
  DatabaseIcon,
  EyeIcon,
  WhatsappIcon,
  WalletIcon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { useReveal } from "./use-reveal";

export function FeaturesSection() {
  const scope = useReveal<HTMLElement>();

  return (
    <section ref={scope} id="features" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl" data-reveal>
          <Badge
            variant="secondary"
            className="rounded-full border border-primary/15 bg-accent px-4 py-1.5 text-accent-foreground"
          >
            Platform
          </Badge>
          <h2 className="font-heading mt-5 text-4xl leading-[1.1] tracking-wide sm:text-5xl md:text-6xl">
            Autonomy,
            <br />
            <span className="text-outline">Minus the Anxiety.</span>
          </h2>
          <p className="mt-5 max-w-xl text-muted-foreground">
            Everything in Deskops is designed around one rule: the AI does the
            work, you keep the keys.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {/* Hero cell — approval queue */}
          <div data-reveal className="md:col-span-2">
            <div className="group relative h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-24px_rgba(110,67,220,0.4)] sm:p-9">
              <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={22} strokeWidth={1.8} />
              </span>
              <h3 className="font-heading mt-5 text-xl tracking-wider sm:text-2xl">
                Human-in-the-loop, always
              </h3>
              <p className="mt-3 max-w-md text-[15px] leading-7 text-muted-foreground">
                Every invoice, payment and outbound message lands in an approval
                queue first. The agent drafts; you decide.
              </p>
              {/* mini approval queue mock */}
              <div className="mt-6 space-y-2.5">
                {[
                  ["Invoice #INV-0218 · LKR 122,500", "Approve"],
                  ["Reply to Kasun · payment reminder", "Approve"],
                ].map(([label, action]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-4 py-3 text-sm"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="btn-purple px-3 py-1 text-xs font-medium">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guardrails */}
          <div data-reveal data-reveal-delay="0.08">
            <div className="group h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-24px_rgba(110,67,220,0.4)]">
              <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
                <HugeiconsIcon icon={ShieldIcon} size={22} strokeWidth={1.8} />
              </span>
              <h3 className="font-heading mt-5 text-xl tracking-wider">
                Guardrails before reality
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                Model output never touches money directly. Numbers are recomputed
                in code and verified against the database before anything ships.
              </p>
              <div className="mt-6 rounded-xl bg-muted/60 p-3.5 font-mono text-[11px] leading-5 text-muted-foreground">
                <span className="text-[#059669]">✓ verify</span> totals against db
                <br />
                <span className="text-[#059669]">✓ redact</span> phone numbers
                <br />
                <span className="text-[#059669]">✓ cap</span> tool loops &amp; spend
              </div>
            </div>
          </div>

          {/* RAG */}
          <div data-reveal>
            <div className="group h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-24px_rgba(110,67,220,0.4)]">
              <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
                <HugeiconsIcon icon={DatabaseIcon} size={22} strokeWidth={1.8} />
              </span>
              <h3 className="font-heading mt-5 text-xl tracking-wider">
                Grounded in your data
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                Replies are retrieved from your own catalog, policies and history
                — cached, hashed, never re-embedded for nothing.
              </p>
            </div>
          </div>

          {/* WhatsApp — wide cell */}
          <div data-reveal data-reveal-delay="0.08" className="md:col-span-2">
            <div className="group flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-border/80 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-24px_rgba(110,67,220,0.4)] sm:flex-row sm:items-center sm:p-9">
              <div className="max-w-md">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#25D366]/10 text-[#25D366]">
                  <HugeiconsIcon icon={WhatsappIcon} size={22} strokeWidth={1.8} />
                </span>
                <h3 className="font-heading mt-5 text-xl tracking-wider sm:text-2xl">
                  Lives where your customers do
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                  No new app for your buyers. Deskops answers on the WhatsApp
                  number your business already uses — in your language and
                  currency.
                </p>
              </div>
              <div className="font-heading shrink-0 text-right">
                <div className="text-5xl tracking-wide text-primary sm:text-6xl">24/7</div>
                <div className="mt-1 text-xs tracking-widest text-muted-foreground uppercase">
                  always answering
                </div>
              </div>
            </div>
          </div>

          {/* Observability */}
          <div data-reveal>
            <div className="group h-full overflow-hidden rounded-2xl border border-border/80 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-24px_rgba(110,67,220,0.4)]">
              <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
                <HugeiconsIcon icon={EyeIcon} size={22} strokeWidth={1.8} />
              </span>
              <h3 className="font-heading mt-5 text-xl tracking-wider">
                Every step traceable
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                Each agent decision, tool call and token is logged with a trace
                id — the "why" is always one click away.
              </p>
            </div>
          </div>

          {/* Cost — wide cell */}
          <div data-reveal data-reveal-delay="0.08" className="md:col-span-2">
            <div className="group flex h-full flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-border/80 bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_24px_60px_-24px_rgba(110,67,220,0.4)] sm:flex-row sm:items-center sm:p-9">
              <div className="max-w-md">
                <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary">
                  <HugeiconsIcon icon={WalletIcon} size={22} strokeWidth={1.8} />
                </span>
                <h3 className="font-heading mt-5 text-xl tracking-wider sm:text-2xl">
                  Cost ceilings built in
                </h3>
                <p className="mt-3 text-[15px] leading-7 text-muted-foreground">
                  Per-business daily model budgets and rate limits mean a chatty
                  Tuesday can't become an expensive one.
                </p>
              </div>
              <div className="w-full max-w-[220px] shrink-0">
                <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                  <span>today's spend</span>
                  <span>38%</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted">
                  <div className="btn-purple h-full w-[38%] rounded-full shadow-none" />
                </div>
                <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                  hard cap · daily budget
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
