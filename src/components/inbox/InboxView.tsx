"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, ArrowLeft01Icon, BubbleChatIcon, SentIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { DotmSquare11 } from "@/components/ui/dotm-square-11";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { contactLabel } from "@/lib/utils/contact";
import { useConversation, useConversations, useSendOwnerMessage, type Conversation, type Message } from "@/lib/query/conversations";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { describeAssistantError } from "@/lib/ai/errors";
import { AgentMessageParts } from "@/components/copilot/AgentMessage";
import { EmptyState, FilterChips, InitialsAvatar, PageShell, relativeTime, SearchField, StatusPill } from "@/components/dashboard/ui";

type StatusFilter = "all" | "open" | "closed";

/** A thread is "waiting" when the newest message came from the customer — nobody has answered it.
 *  There is no read/unread column, and this is the thing an owner actually needs to spot. */
function isWaiting(conversation: Conversation) {
  return conversation.lastMessage?.direction === "inbound";
}

function previewPrefix(message: NonNullable<Conversation["lastMessage"]>) {
  if (message.direction === "inbound") return "";
  return message.sender === "agent" ? "Agent: " : "You: ";
}

function ConversationList({ activeId, onSelect }: { activeId: string | null; onSelect: (id: string) => void }) {
  const { data: conversations, isLoading } = useConversations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (conversations ?? []).filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!term) return true;
      // Search the message text too — searching an inbox by contact name alone is not searching.
      return `${contactLabel(c.customers)} ${c.lastMessage?.body ?? ""}`.toLowerCase().includes(term);
    });
  }, [conversations, search, status]);

  const waiting = (conversations ?? []).filter(isWaiting).length;

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border/60 p-3">
        <SearchField value={search} onChange={setSearch} placeholder="Search name or message…" />
        <FilterChips<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: conversations?.length },
            { value: "open", label: "Open", count: conversations?.filter((c) => c.status === "open").length },
            { value: "closed", label: "Closed", count: conversations?.filter((c) => c.status === "closed").length },
          ]}
        />
        {waiting > 0 && (
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium text-primary">{waiting}</span> waiting on a reply
          </p>
        )}
      </div>

      <div className="flex-1 divide-y divide-border/50 overflow-y-auto">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <EmptyState
            icon={WhatsappIcon}
            title={search ? "No matches" : "No conversations"}
            hint={search ? "Try a different search." : "Customer WhatsApp messages appear here the moment they arrive."}
            className="py-12"
          />
        )}
        {filtered.map((c) => {
          const active = c.id === activeId;
          const waitingOnUs = isWaiting(c);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-start gap-3 px-3 py-3 text-left transition-colors",
                active ? "bg-primary/[0.06] shadow-[inset_2px_0_0_0_var(--primary)]" : "hover:bg-muted/40",
              )}
            >
              <div className="relative shrink-0">
                <InitialsAvatar name={contactLabel(c.customers)} />
                {/* One dot carries "needs you" — far cheaper to scan than a pill on every row. */}
                {waitingOnUs && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-primary" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate text-sm", waitingOnUs ? "font-semibold" : "font-medium")}>{contactLabel(c.customers)}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(c.last_message_at)}</span>
                </div>
                <p className={cn("mt-0.5 truncate text-xs", waitingOnUs ? "text-foreground" : "text-muted-foreground")}>
                  {c.lastMessage ? `${previewPrefix(c.lastMessage)}${c.lastMessage.body}` : "No messages yet"}
                </p>
                {/* Only when it is not the default — "open" on every row said nothing. */}
                {c.status !== "open" && (
                  <div className="mt-1">
                    <StatusPill tone="neutral" dot={false}>
                      {c.status}
                    </StatusPill>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

const SENDER_LABEL = { customer: "Customer", agent: "AI agent", owner: "You" } as const;

function Bubble({ message }: { message: Message }) {
  const outbound = message.direction === "outbound";
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div className="max-w-[78%]">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
            outbound ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-border/60 bg-card",
          )}
        >
          {message.media_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={message.media_url} alt="" className="mb-1.5 max-h-48 w-full rounded-lg object-cover" />
          )}
          <p className="whitespace-pre-wrap">{message.body}</p>
        </div>
        {/* Out of the bubble: the meta line was competing with the message inside it. */}
        <p className={cn("mt-1 px-1 text-[10px] text-muted-foreground", outbound && "text-right")}>
          {SENDER_LABEL[message.sender]} · {time}
        </p>
      </div>
    </div>
  );
}

function ThreadPane({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { data: conversation, isLoading } = useConversation(conversationId);
  const sendMessage = useSendOwnerMessage(conversationId);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = conversation?.messages.length ?? 0;

  // The agent draft is a one-shot ask, not a thread — only the newest assistant turn is shown.
  const agent = useChat({ transport: new DefaultChatTransport({ api: "/api/agent/run", body: { conversationId } }) });
  const agentRunning = agent.status === "submitted" || agent.status === "streaming";
  const agentReply = [...agent.messages].reverse().find((m) => m.role === "assistant");
  const agentError = describeAssistantError(agent.error, typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messageCount, agent.messages]);

  async function sendOwnerReply() {
    if (!draft.trim()) return;
    try {
      await sendMessage.mutateAsync(draft);
      setDraft("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send the message.");
    }
  }

  function askAgent() {
    if (!draft.trim() || agentRunning) return;
    void agent.sendMessage({ text: draft });
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Spinner />
      </div>
    );
  }
  if (!conversation) return <EmptyState icon={WhatsappIcon} title="Conversation not found" className="h-full" />;

  // Group messages by day for WhatsApp-style separators.
  const groups: { day: string; messages: Message[] }[] = [];
  for (const message of conversation.messages) {
    const day = dayLabel(message.created_at);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.messages.push(message);
    else groups.push({ day, messages: [message] });
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5">
        <Button variant="ghost" size="sm" className="size-8 shrink-0 p-0 lg:hidden" onClick={onBack} aria-label="Back to conversations">
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
        </Button>
        <InitialsAvatar name={contactLabel(conversation.customers)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{contactLabel(conversation.customers)}</p>
          <p className="truncate text-xs text-muted-foreground">{conversation.customers?.whatsapp_number ?? "WhatsApp"}</p>
        </div>
        {conversation.status !== "open" && (
          <StatusPill tone="neutral" dot={false}>
            {conversation.status}
          </StatusPill>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
        {conversation.messages.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No messages yet.</p>}
        {groups.map((group) => (
          <div key={group.day} className="space-y-3">
            <div className="flex items-center gap-3 py-1">
              <span className="h-px flex-1 bg-border/70" />
              <span className="text-[11px] font-medium text-muted-foreground">{group.day}</span>
              <span className="h-px flex-1 bg-border/70" />
            </div>
            {group.messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
          </div>
        ))}
        {(agentReply || agentRunning) && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <HugeiconsIcon icon={AiBrain01Icon} size={15} />
              Draft for you — not sent
            </div>
            <div className="mt-2">
              {agentReply ? (
                <AgentMessageParts message={agentReply} streaming={agentRunning} />
              ) : (
                <span className="flex items-center gap-2 text-sm">
                  <DotmSquare11 size={16} dotSize={2} ariaLabel="" className="shrink-0" />
                  <span className="t-shimmer" data-text="Drafting a reply…">
                    Drafting a reply…
                  </span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        {agentError && (
          <p role="alert" className="mb-2 text-sm text-destructive">
            <span className="font-medium">{agentError.title}</span> {agentError.detail}
          </p>
        )}
        <div className="rounded-xl border border-border/70 bg-background focus-within:border-primary/40">
          <Textarea
            placeholder="Type a reply…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendOwnerReply();
              }
            }}
            rows={2}
            className="min-h-0 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center gap-2 px-2 pb-2">
            {/* Secondary and clearly labelled — two stacked icon buttons read as two send buttons. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={askAgent} disabled={agentRunning || !draft.trim()} className="h-8 rounded-lg text-xs">
                  {agentRunning ? <Spinner /> : <HugeiconsIcon icon={AiBrain01Icon} size={14} />}
                  Draft with AI
                </Button>
              </TooltipTrigger>
              <TooltipContent>Turn your note into a reply — shown to you first, never sent automatically</TooltipContent>
            </Tooltip>
            <span className="ml-auto text-[11px] text-muted-foreground">Enter sends · Shift+Enter newline</span>
            <Button
              onClick={sendOwnerReply}
              disabled={sendMessage.isPending || !draft.trim()}
              className="btn-purple h-8 rounded-lg border-0 px-3"
              aria-label="Send reply"
            >
              {sendMessage.isPending ? <Spinner /> : <HugeiconsIcon icon={SentIcon} size={15} />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function InboxView({ conversationId }: { conversationId?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Selection lives in the URL (?c=) so links, refresh and back still work, but switching threads
  // is a shallow replace rather than a route transition that remounts the whole list.
  const [selected, setSelected] = useState<string | null>(conversationId ?? searchParams.get("c"));

  function select(id: string | null) {
    setSelected(id);
    router.replace(id ? `/dashboard/inbox?c=${id}` : "/dashboard/inbox", { scroll: false });
  }

  return (
    <PageShell crumbs={["Inbox"]} width="max-w-[1400px]">
      {/* Fills exactly what is left of the viewport so only the thread scrolls, never the page.
          Subtracts the sticky header (3.5rem), main's vertical padding (1.5rem ×2, 2rem ×2 at sm)
          and the shell's pb-28 dock clearance (7rem) — without that last one the copilot dock
          sits on top of the composer. */}
      <div className="grid h-[calc(100svh-13.5rem)] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm sm:h-[calc(100svh-14.5rem)] lg:grid-cols-[330px_1fr]">
        <div className={cn("min-h-0 border-border/60 lg:border-r", selected && "hidden lg:block")}>
          <ConversationList activeId={selected} onSelect={select} />
        </div>
        <div className={cn("min-h-0 min-w-0", !selected && "hidden lg:block")}>
          {selected ? (
            <ThreadPane key={selected} conversationId={selected} onBack={() => select(null)} />
          ) : (
            <EmptyState
              icon={BubbleChatIcon}
              title="Select a conversation"
              hint="Replies you type send straight to the customer's WhatsApp. Agent drafts wait for your go-ahead."
              className="h-full"
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}
