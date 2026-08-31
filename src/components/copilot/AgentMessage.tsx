"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowDown01Icon, CheckmarkCircle02Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart, type UIMessage } from "ai";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

/** "draftAndQueueInvoice" → "Draft and queue invoice". Beats a hand-kept label map that goes
 *  stale the moment someone adds a tool. */
function humanize(toolName: string) {
  const words = toolName.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Our tools resolve to { error } rather than throwing, so a failure can hide inside a
 *  successful output. */
function toolErrorText(part: unknown): string | null {
  const output = (part as { output?: unknown }).output;
  if (output && typeof output === "object") {
    const message = (output as { error?: unknown }).error;
    if (typeof message === "string") return message;
  }
  return null;
}

export function assistantText(message: UIMessage): string {
  return message.parts.filter(isTextUIPart).map((part) => part.text).join("");
}

/**
 * Reasoning as it streams. Split on whitespace and keyed by index, so React mounts only the
 * word that just arrived — each one fades in once, and the words already on screen hold still.
 * Re-rendering the joined string instead would restart every animation on every token.
 */
function StreamingReasoning({ text, streaming }: { text: string; streaming: boolean }) {
  const endRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (streaming) endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [text, streaming]);

  // Keep the separators: splitting on the gaps loses the line breaks the model writes.
  const words = text.split(/(\s+)/);

  return (
    <p className="text-xs leading-5 whitespace-pre-wrap text-muted-foreground italic">
      {words.map((word, index) => (
        <span key={index} className={streaming ? "t-word" : undefined}>
          {word}
        </span>
      ))}
      <span ref={endRef} />
    </p>
  );
}

/**
 * One assistant turn, in two clearly separate zones: the work it did (reasoning + tool calls)
 * behind a disclosure, then the answer below a rule. Shared by the copilot dock and the inbox
 * draft so both surfaces explain a slow reply the same way.
 */
export function AgentMessageParts({
  message,
  streaming,
  seconds = 0,
  open,
  onOpenChange,
}: {
  message: UIMessage;
  streaming: boolean;
  seconds?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const reasoning = message.parts.filter(isReasoningUIPart).map((part) => part.text).join("\n").trim();
  const tools = message.parts.filter(isToolUIPart);
  const text = assistantText(message);
  const hasWork = Boolean(reasoning) || tools.length > 0;
  const label = streaming ? "Working…" : `Worked for ${seconds || 1}s`;
  // A settled turn that did work but never wrote an answer is a failed run, not an empty one.
  // Rendering nothing here is what made it look like the agent had stopped responding.
  const stoppedShort = !streaming && hasWork && !text.trim();

  return (
    <div className="flex flex-col">
      {hasWork && (
        <Collapsible open={open} onOpenChange={onOpenChange}>
          <CollapsibleTrigger className="group flex w-full items-center gap-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground">
            {streaming ? <span className="t-shimmer" data-text={label}>{label}</span> : <span>{label}</span>}
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={14}
              className="transition-transform duration-250 group-data-[state=open]:rotate-180"
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5">
              {reasoning && (
                <>
                  <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Thought process</p>
                  <StreamingReasoning text={reasoning} streaming={streaming} />
                </>
              )}

              {tools.map((part, index) => {
                const failure = part.state === "output-error" ? "" : toolErrorText(part);
                const failed = part.state === "output-error" || failure !== null;
                const done = part.state === "output-available" && !failed;

                return (
                  <p key={index} className={cn("flex items-start gap-1.5 text-xs", failed ? "text-destructive" : "text-muted-foreground")}>
                    <HugeiconsIcon icon={done ? CheckmarkCircle02Icon : Clock01Icon} size={14} className="mt-0.5 shrink-0" />
                    <span>
                      {humanize(getToolName(part))}
                      {failed ? ` — ${failure || "could not complete"}` : null}
                      {!failed && !done ? "…" : null}
                    </span>
                  </p>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {text && (
        <div className={cn("copilot-md overflow-x-auto text-sm leading-6", hasWork && "mt-3 border-t border-border/60 pt-3")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
      )}

      {stoppedShort && (
        <p className="mt-3 flex items-start gap-1.5 border-t border-border/60 pt-3 text-sm text-muted-foreground">
          <HugeiconsIcon icon={AlertCircleIcon} size={15} className="mt-0.5 shrink-0 text-destructive" />
          The model looked things up but stopped before writing an answer. Send it again.
        </p>
      )}
    </div>
  );
}
