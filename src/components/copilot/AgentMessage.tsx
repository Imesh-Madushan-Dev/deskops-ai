"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, BrainIcon } from "@hugeicons/core-free-icons";
import type { UIMessage } from "ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** "draftAndQueueInvoice" → "Draft and queue invoice". Beats a hand-kept label map that goes stale
 *  the moment someone adds a tool. */
function humanize(toolName: string) {
  const words = toolName.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function ThoughtProcess({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mb-2">
      <CollapsibleTrigger className="flex items-center gap-1.5 rounded-md text-[11px] text-muted-foreground transition-colors hover:text-foreground">
        <HugeiconsIcon icon={BrainIcon} size={12} />
        <span className={cn(streaming && "t-shimmer")} data-text="Thinking…">
          {streaming ? "Thinking…" : "Thought process"}
        </span>
        <HugeiconsIcon icon={ArrowDown01Icon} size={12} className={cn("transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1.5 border-l-2 border-border/70 pl-2.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
        {text}
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Renders one assistant message: its reasoning (collapsed), what tools it ran, then the answer.
 *  Tool status is the first thing that explains *why* a reply took four seconds. */
export function AgentMessageParts({ message, streaming }: { message: UIMessage; streaming: boolean }) {
  return (
    <div>
      {message.parts.map((part, index) => {
        if (part.type === "reasoning") {
          return <ThoughtProcess key={index} text={part.text} streaming={part.state !== "done"} />;
        }

        if (part.type === "text") {
          return (
            <div key={index} className="copilot-md overflow-x-auto text-sm leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.text}</ReactMarkdown>
            </div>
          );
        }

        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          const name = part.type === "dynamic-tool" ? part.toolName : part.type.slice("tool-".length);
          const state = "state" in part ? part.state : undefined;
          const done = state === "output-available" || state === "output-error";
          return (
            <p key={index} className="mb-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", state === "output-error" ? "bg-destructive" : done ? "bg-muted-foreground/40" : "bg-primary")} />
              <span className={cn(!done && "t-shimmer")} data-text={humanize(name)}>
                {humanize(name)}
                {done ? "" : "…"}
              </span>
            </p>
          );
        }

        return null;
      })}
      {streaming && message.parts.length === 0 && (
        <span className="t-shimmer text-sm" data-text="Thinking…">Thinking…</span>
      )}
    </div>
  );
}
