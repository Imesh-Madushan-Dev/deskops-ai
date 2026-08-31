"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isReasoningUIPart, isTextUIPart, isToolUIPart } from "ai";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowExpand01Icon,
  ArrowShrink01Icon,
  ArrowUp01Icon,
  Cancel01Icon,
  ChartLineData01Icon,
  Clock01Icon,
  PackageIcon,
  PencilEdit01Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { describeAssistantError } from "@/lib/ai/errors";
import { AgentMessageParts, assistantText } from "./AgentMessage";
import { ModelPicker } from "./ModelPicker";

type IconType = typeof Clock01Icon;

/** The command palette's "Ask the copilot" has no path to this component's state, and threading
 *  a ref through the shell for one focus call is more plumbing than it is worth.
 *  ponytail: a window event; swap to context if a second caller ever appears. */
export const COPILOT_FOCUS_EVENT = "copilot:focus";

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  className,
  type = "button",
}: {
  icon: IconType;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type={type}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(
            "t-press grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground",
            "hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
            "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
            className,
          )}
        >
          <HugeiconsIcon icon={icon} size={16} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Chip({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon: IconType;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="t-press inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40"
    >
      <HugeiconsIcon icon={icon} size={14} />
      {children}
    </button>
  );
}

export function CopilotDock() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [tall, setTall] = useState(false);
  const [offline, setOffline] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const [workOpen, setWorkOpen] = useState<Record<string, boolean>>({});
  const [modelId, setModelId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedAt = useRef<number | null>(null);
  // A follow-up typed mid-run. Nothing renders from it, so a ref keeps it out of the render path.
  const queued = useRef<string | null>(null);

  const { messages, sendMessage, setMessages, regenerate, status, stop, error } = useChat({
    // A function, so the page and the chosen model are read at send time rather than frozen
    // when the transport was constructed.
    transport: new DefaultChatTransport({ api: "/api/copilot", body: () => ({ path: pathname, modelId }) }),
    // An error must never land inside a collapsed card.
    onError: () => setOpen(true),
  });

  const busy = status === "submitted" || status === "streaming";
  const errorCopy = describeAssistantError(error, offline);
  const cardOpen = open && (messages.length > 0 || Boolean(errorCopy));

  const last = messages.at(-1);
  const lastAssistantId = last?.role === "assistant" ? last.id : undefined;
  const lastHasContent = Boolean(
    last?.role === "assistant" &&
      last.parts.some((part) => isTextUIPart(part) || isReasoningUIPart(part) || isToolUIPart(part)),
  );

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  useEffect(() => {
    function focus() {
      setOpen(messages.length > 0);
      inputRef.current?.focus();
    }
    window.addEventListener(COPILOT_FOCUS_EVENT, focus);
    return () => window.removeEventListener(COPILOT_FOCUS_EVENT, focus);
  }, [messages.length]);

  // Live "Working…", then frozen as "Worked for Ns" against the message it belongs to.
  // Ticks faster than it displays so the previous run's value is never on screen long enough
  // to read — which also keeps the reset out of the effect body.
  useEffect(() => {
    if (!busy) return;
    startedAt.current = Date.now();
    const id = setInterval(() => {
      if (startedAt.current) setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    }, 200);
    return () => clearInterval(id);
  }, [busy]);

  useEffect(() => {
    if (busy || startedAt.current === null) return;
    const seconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    startedAt.current = null;
    const settled = messages.filter((m) => m.role === "assistant").at(-1);
    if (settled) setDurations((current) => ({ ...current, [settled.id]: seconds }));

    // A follow-up typed mid-run goes out as soon as the run settles.
    const followUp = queued.current;
    if (followUp) {
      queued.current = null;
      void sendMessage({ text: followUp });
    }
    // The agent's tools wrote straight to Postgres, so nothing told this browser's cache. Realtime
    // would eventually say so, but this is the one path where we know a write happened and exactly
    // when it finished — so drop the whole dashboard cache rather than wait for the WAL round trip
    // or depend on the feed being configured. One refetch burst per agent turn, not a poll.
    void queryClient.invalidateQueries();
  }, [busy, messages, sendMessage, queryClient]);

  // setOpen lives in submit/quickSend/onError — every path that adds a message already opens
  // the card, so this only has to follow the scroll.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = input.trim();
    if (!value) return;

    setInput("");
    setOpen(true);
    if (busy) queued.current = value;
    else void sendMessage({ text: value });
    inputRef.current?.focus();
  }

  function quickSend(text: string) {
    if (busy) return;
    setOpen(true);
    void sendMessage({ text });
  }

  function newChat() {
    setMessages([]);
    setDurations({});
    setWorkOpen({});
    queued.current = null;
    setOpen(false);
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pl-68">
        <div className="pointer-events-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-lg">
          <div className="t-extend" style={{ gridTemplateRows: cardOpen ? "1fr" : "0fr" }}>
            <div className="min-h-0 overflow-hidden">
              <header className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                  <HugeiconsIcon icon={SparklesIcon} size={14} className="text-primary" />
                  Copilot
                </span>
                <div className="flex items-center gap-0.5">
                  <IconButton icon={PencilEdit01Icon} label="New chat" onClick={newChat} />
                  <IconButton
                    icon={tall ? ArrowShrink01Icon : ArrowExpand01Icon}
                    label={tall ? "Shrink panel" : "Expand panel"}
                    onClick={() => setTall((value) => !value)}
                  />
                  <IconButton icon={Cancel01Icon} label="Close" onClick={() => setOpen(false)} />
                </div>
              </header>

              <div
                ref={scrollRef}
                className={cn(
                  "flex flex-col gap-4 overflow-y-auto px-4 pb-4 transition-[max-height] duration-350",
                  tall ? "max-h-[70vh]" : "max-h-[40vh]",
                )}
              >
                {messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="flex justify-end">
                      <p className="max-w-[85%] rounded-xl bg-muted px-3 py-1.5 text-sm whitespace-pre-wrap">
                        {assistantText(message)}
                      </p>
                    </div>
                  ) : (
                    <AgentMessageParts
                      key={message.id}
                      message={message}
                      seconds={durations[message.id] ?? elapsed}
                      streaming={busy && message.id === lastAssistantId}
                      // Opens itself while the model works, collapses when it finishes;
                      // a manual toggle outranks both.
                      open={workOpen[message.id] ?? (busy && message.id === lastAssistantId)}
                      onOpenChange={(value) => setWorkOpen((current) => ({ ...current, [message.id]: value }))}
                    />
                  ),
                )}

                {busy && !lastHasContent && (
                  <p role="status" aria-live="polite" className="t-shimmer text-xs" data-text="Thinking…">
                    Thinking…
                  </p>
                )}

                {errorCopy && (
                  <div role="alert" className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                    <p className="text-sm font-medium text-destructive">{errorCopy.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{errorCopy.detail}</p>
                    {errorCopy.retryable && (
                      <button
                        type="button"
                        onClick={() => void regenerate()}
                        className="t-press mt-2 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-2">
            <div className="flex items-center gap-0.5 overflow-x-auto px-1 pb-1.5">
              <Chip icon={ChartLineData01Icon} onClick={() => quickSend("What sold today?")} disabled={busy}>
                What sold today
              </Chip>
              <Chip icon={PackageIcon} onClick={() => quickSend("What is low on stock?")} disabled={busy}>
                Low on stock
              </Chip>
              <Chip icon={SparklesIcon} onClick={() => quickSend("Summarize this page for me")} disabled={busy}>
                Summarize page
              </Chip>

              <div className="ml-auto" />

              <Chip icon={Clock01Icon} onClick={() => router.push("/dashboard/approvals")}>
                Approvals
              </Chip>
            </div>

            <form
              onSubmit={submit}
              // rainbow-edge paints at inset -2px, inside the p-2 wrapper, so the card's
              // overflow-hidden never clips it. Its own ring replaces the old ring-4 glow.
              className="rainbow-edge flex items-center gap-1 rounded-2xl border border-border/70 bg-background px-3 py-1.5 focus-within:border-ring/40"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                // Focusing is the way back into a collapsed conversation.
                onFocus={() => {
                  if (messages.length > 0) setOpen(true);
                }}
                placeholder={busy ? "Queue follow-up…" : "Ask your back office…"}
                aria-label="Message the copilot"
                className="min-w-0 flex-1 bg-transparent py-1 text-sm placeholder:text-muted-foreground focus:outline-none"
              />

              <ModelPicker value={modelId} onChange={setModelId} />

              {busy ? (
                <IconButton icon={Cancel01Icon} label="Stop" onClick={() => stop()} className="btn-purple text-white hover:opacity-90" />
              ) : (
                <IconButton
                  icon={ArrowUp01Icon}
                  label="Send"
                  type="submit"
                  disabled={!input.trim()}
                  className="btn-purple text-white hover:opacity-90"
                />
              )}
            </form>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
