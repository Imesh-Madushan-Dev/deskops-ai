"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, Cancel01Icon, SentIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["What sold today?", "What's low on stock?", "Summarize this page for me"];

export function CopilotPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setError(null);
    setDraft("");
    const thread: ChatMessage[] = [...messages, { role: "user", content: message }];
    setMessages([...thread, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: thread.slice(-20), path: pathname }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Copilot is unavailable right now.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        const current = reply;
        setMessages([...thread, { role: "assistant", content: current }]);
      }
      if (!reply.trim()) setMessages(thread);
    } catch (err) {
      setMessages(thread);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setStreaming(false);
    }
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

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mt-6 space-y-3">
            <p className="text-center text-sm text-muted-foreground">Ask anything about your business — sales, stock, customers, books.</p>
            <div className="flex flex-col gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((message, index) => (
          <div key={index} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
                message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {message.content || <Spinner className="my-1" />}
            </div>
          </div>
        ))}
        {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>

      <form
        className="shrink-0 border-t border-border/70 p-3"
        onSubmit={(event) => { event.preventDefault(); void send(draft); }}
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(draft); }
            }}
            placeholder="Ask your back office…"
            rows={1}
            className="max-h-32 min-h-10 flex-1 resize-none"
            disabled={streaming}
          />
          <Button type="submit" size="icon" disabled={streaming || !draft.trim()} className="btn-purple size-10 shrink-0 border-0" aria-label="Send">
            {streaming ? <Spinner /> : <HugeiconsIcon icon={SentIcon} size={16} />}
          </Button>
        </div>
      </form>
    </aside>
  );
}
