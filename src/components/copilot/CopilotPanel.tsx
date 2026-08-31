"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, Cancel01Icon, Copy01Icon, RefreshIcon, SentIcon, Tick02Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { describeAssistantError } from "@/lib/ai/errors";
import { AgentMessageParts } from "./AgentMessage";

const SUGGESTIONS = ["What sold today?", "What's low on stock?", "Summarize this page for me"];

/** The plain text of an assistant message, for the copy button — reasoning and tool status are
 *  scaffolding, not something the owner wants on their clipboard. */
function answerText(parts: { type: string }[]): string {
  return parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
      <button
        type="button"
        onClick={() => void copy()}
        aria-label="Copy response"
        className="flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
      >
        <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={12} />
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, regenerate } = useChat({
    transport: new DefaultChatTransport({ api: "/api/copilot", body: { path: pathname } }),
  });
  const busy = status === "submitted" || status === "streaming";
  const failure = describeAssistantError(error, typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    void sendMessage({ text: message });
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-border/70 bg-background shadow-xl transition-transform duration-200 xl:z-20 xl:shadow-none",
        open ? "translate-x-0" : "translate-x-full",
      )}
      aria-label="Business copilot"
      aria-hidden={!open}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <div className="flex items-center gap-2.5">
          <span className="btn-purple flex size-8 items-center justify-center rounded-lg"><HugeiconsIcon icon={AiBrain01Icon} size={16} /></span>
          <div>
            <p className="text-sm font-semibold leading-tight">Copilot</p>
            <p className="text-[11px] leading-tight text-muted-foreground">Knows the page you&apos;re on</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close copilot" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <HugeiconsIcon icon={Cancel01Icon} size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-muted-foreground">Ask anything about your business — sales, stock, customers, books.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => {
          const last = index === messages.length - 1;
          if (message.role === "user") {
            return (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-sm whitespace-pre-wrap text-primary-foreground">
                  {answerText(message.parts)}
                </div>
              </div>
            );
          }
          const text = answerText(message.parts);
          return (
            <div key={message.id}>
              <AgentMessageParts message={message} streaming={busy && last} />
              {(!busy || !last) && text && <CopyButton text={text} />}
            </div>
          );
        })}
        {status === "submitted" && (
          <span className="t-shimmer text-sm" data-text="Thinking…">Thinking…</span>
        )}
        {failure && (
          <div role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <p className="font-medium">{failure.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{failure.detail}</p>
            {failure.retryable && (
              <button
                type="button"
                onClick={() => void regenerate()}
                className="mt-1.5 flex items-center gap-1 text-xs font-medium underline underline-offset-2"
              >
                <HugeiconsIcon icon={RefreshIcon} size={12} />
                Try again
              </button>
            )}
          </div>
        )}
      </div>

      <form
        className="shrink-0 border-t border-border/70 p-3"
        onSubmit={(event) => { event.preventDefault(); send(draft); }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(draft); }
            }}
            placeholder="Ask your back office…"
            rows={1}
            className="max-h-32 min-h-10 flex-1 resize-none"
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !draft.trim()} className="btn-purple size-10 shrink-0 border-0" aria-label="Send">
            {busy ? <Spinner /> : <HugeiconsIcon icon={SentIcon} size={16} />}
          </Button>
        </div>
      </form>
    </aside>
  );
}
