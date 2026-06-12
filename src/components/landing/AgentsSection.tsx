"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  AiBrain01Icon,
  AiChat02Icon,
  InvoiceIcon,
  PackageIcon,
  BookOpen01Icon,
  ArrowRight02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { useReveal } from "./use-reveal";

type AgentDef = {
  icon: IconSvgElement;
  name: string;
  blurb: string;
  tools: string[];
};

const agents: AgentDef[] = [
  {
    icon: AiChat02Icon,
    name: "Customer Agent",
    blurb:
      "Answers customers on WhatsApp with RAG-grounded replies — your catalog, policies and history, never guesses.",
    tools: ["faq lookup", "order status", "handoff"],
  },
  {
    icon: InvoiceIcon,
    name: "Sales Agent",
    blurb:
      "Drafts quotes and invoices with totals computed in code, not by the model. Every send waits in your approval queue.",
    tools: ["draft invoice", "quote", "record sale"],
  },
  {
    icon: PackageIcon,
    name: "Inventory Agent",
    blurb:
      "Tracks stock in real time, flags low quantities, and reconciles movements inside a single atomic transaction.",
    tools: ["check stock", "adjust stock", "low-stock alert"],
  },
  {
    icon: BookOpen01Icon,
    name: "Books Agent",
    blurb:
      "Keeps a clean ledger as sales and payments land, and surfaces a daily cash insight you can read in ten seconds.",
    tools: ["ledger entry", "daily insight", "expense log"],
  },
];

export function AgentsSection() {
  const scope = useReveal<HTMLElement>();

  return (
    <section ref={scope} id="agents" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between" data-reveal>
          <div className="max-w-xl">
            <Badge
              variant="secondary"
              className="rounded-full border border-primary/15 bg-accent px-4 py-1.5 text-accent-foreground"
            >
              The team
            </Badge>
            <h2 className="font-heading mt-5 text-4xl leading-[1.1] tracking-wide sm:text-5xl md:text-6xl">
              One Orchestrator.
              <br />
              <span className="text-outline">Four Specialists.</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground sm:pb-2">
            Intent comes in, the Orchestrator routes it to the right specialist,
            and small single-purpose tools do the work — no giant do-everything
            prompt.
          </p>
        </div>

        {/* Orchestrator hub */}
        <div className="mt-14 flex items-center gap-4" data-reveal>
          <div className="btn-purple flex items-center gap-3 px-5 py-3">
            <HugeiconsIcon icon={AiBrain01Icon} size={22} strokeWidth={1.8} />
            <div className="text-left">
              <div className="font-heading text-sm tracking-wider">Orchestrator</div>
              <div className="text-xs text-white/80">routes · plans · delegates</div>
            </div>
          </div>
          <div className="h-px flex-1 bg-border" aria-hidden />
          <span className="font-mono text-xs text-muted-foreground">routes to ↓</span>
        </div>

        {/* Awwwards-style index rows */}
        <div className="mt-8">
          {agents.map((agent, i) => (
            <div key={agent.name} data-reveal data-reveal-delay={i * 0.06}>
              <div className="group relative cursor-default overflow-hidden border-t border-border last:border-b">
                {/* fill that slides up on hover */}
                <div
                  className="absolute inset-0 translate-y-full bg-foreground transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:translate-y-0"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-4 px-2 py-9 transition-colors duration-300 sm:flex-row sm:items-center sm:gap-8 sm:px-4">
                  <span className="font-mono text-sm text-primary transition-colors duration-300 group-hover:text-white/60">
                    0{i + 1}
                  </span>
                  <div className="flex items-center gap-4 sm:w-[40%]">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary transition-colors duration-300 group-hover:border-white/20 group-hover:bg-white/10 group-hover:text-white">
                      <HugeiconsIcon icon={agent.icon} size={22} strokeWidth={1.8} />
                    </span>
                    <h3 className="font-heading text-2xl tracking-wide transition-colors duration-300 group-hover:text-white sm:text-3xl">
                      {agent.name}
                    </h3>
                  </div>
                  <div className="flex-1">
                    <p className="max-w-md text-sm leading-6 text-muted-foreground transition-colors duration-300 group-hover:text-white/70">
                      {agent.blurb}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {agent.tools.map((tool) => (
                        <span
                          key={tool}
                          className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors duration-300 group-hover:bg-white/10 group-hover:text-white/70"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="hidden size-11 items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-300 group-hover:-rotate-45 group-hover:border-white/30 group-hover:text-white sm:flex">
                    <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
