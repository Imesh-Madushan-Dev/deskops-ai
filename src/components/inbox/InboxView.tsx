"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, BubbleChatIcon, SentIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { contactLabel } from "@/lib/utils/contact";
import { useConversation, useConversations, useSendOwnerMessage, type Message } from "@/lib/query/conversations";
import { EmptyState, FilterChips, InitialsAvatar, PageShell, relativeTime, SearchField, StatusPill } from "@/components/dashboard/ui";

type StatusFilter = "all" | "open" | "snoozed" | "closed";

function ConversationList({ activeId }: { activeId?: string }) {
  const { data: conversations, isLoading } = useConversations();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = (conversations ?? []).filter((c) => {
    if (status !== "all" && c.status !== status) return false;
    return contactLabel(c.customers).toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border/60 p-4">
        <SearchField value={search} onChange={setSearch} placeholder="Search conversations…" />
        <FilterChips<StatusFilter>
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All", count: conversations?.length },
            { value: "open", label: "Open", count: conversations?.filter((c) => c.status === "open").length },
            { value: "closed", label: "Closed" },
          ]}
        />
      </div>
      <div className="flex-1 divide-y divide-border/50 overflow-y-auto">
        {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && <EmptyState icon={WhatsappIcon} title="No conversations" hint="Customer WhatsApp messages appear here the moment they arrive." className="py-12" />}
        {filtered.map((c) => (
          <Link
            key={c.id}
            href={`/dashboard/inbox/${c.id}`}
            className={cn("flex items-center gap-3 px-4 py-3 transition-colors", c.id === activeId ? "bg-primary/[0.06] shadow-[inset_2px_0_0_0_var(--primary)]" : "hover:bg-muted/40")}
          >
            <InitialsAvatar name={contactLabel(c.customers)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium">{contactLabel(c.customers)}</p>
                <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime(c.last_message_at)}</span>
              </div>
              <div className="mt-0.5"><StatusPill tone={c.status === "open" ? "brand" : "neutral"} dot={false}>{c.status}</StatusPill></div>
            </div>
          </Link>
        ))}
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

function Bubble({ message }: { message: Message }) {
  const outbound = message.direction === "outbound";
  return (
    <div className={cn("flex", outbound ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", outbound ? "rounded-br-md bg-primary text-white" : "rounded-bl-md border border-border/60 bg-card")}>
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p className={cn("mt-1 text-[10px] tracking-wide uppercase", outbound ? "text-white/70" : "text-muted-foreground")}>
          {message.sender === "agent" ? "AI agent" : message.sender} · {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function ThreadPane({ conversationId }: { conversationId: string }) {
  const { data: conversation, isLoading } = useConversation(conversationId);
  const sendMessage = useSendOwnerMessage(conversationId);
  const [draft, setDraft] = useState("");
  const [agentReply, setAgentReply] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageCount = conversation?.messages.length ?? 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messageCount, agentReply]);

  async function sendOwnerReply() {
    if (!draft.trim()) return;
    setError(null);
    try {
      await sendMessage.mutateAsync(draft);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send message.");
    }
  }

  async function askAgent() {
    if (!draft.trim()) return;
    setError(null);
    setAgentRunning(true);
    setAgentReply("");
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: draft }),
      });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => null))?.error ?? "Agent run failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAgentReply((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed.");
    } finally {
      setAgentRunning(false);
    }
  }

  if (isLoading) return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>;
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
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <InitialsAvatar name={contactLabel(conversation.customers)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{contactLabel(conversation.customers)}</p>
          <p className="text-xs text-muted-foreground">WhatsApp · owner replies send immediately, agent drafts wait for approval</p>
        </div>
        <StatusPill tone={conversation.status === "open" ? "brand" : "neutral"} dot={false}>{conversation.status}</StatusPill>
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
            {group.messages.map((message) => <Bubble key={message.id} message={message} />)}
          </div>
        ))}
        {agentReply && (
          <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-3.5">
            <div className="flex items-center gap-2"><HugeiconsIcon icon={AiBrain01Icon} size={15} className="text-primary" /><Badge variant="secondary" className="text-[11px]">Agent notes</Badge></div>
            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap">{agentReply}</p>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 p-3.5">
        {error && <p role="alert" className="mb-2 text-sm text-destructive">{error}</p>}
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Type a reply… (Enter to send, Shift+Enter for newline)"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendOwnerReply();
              }
            }}
            rows={2}
            className="min-h-0 resize-none rounded-xl"
          />
          <div className="flex shrink-0 flex-col gap-1.5">
            <Button onClick={sendOwnerReply} disabled={sendMessage.isPending || !draft.trim()} className="btn-purple h-9 rounded-lg border-0 px-3.5" aria-label="Send reply">
              {sendMessage.isPending ? <Spinner /> : <HugeiconsIcon icon={SentIcon} size={16} />}
            </Button>
            <Button variant="outline" onClick={askAgent} disabled={agentRunning || !draft.trim()} className="h-9 rounded-lg px-3.5" title="Ask agent to draft">
              {agentRunning ? <Spinner /> : <HugeiconsIcon icon={AiBrain01Icon} size={16} />}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">Agent-drafted invoices or replies go to Approvals — nothing reaches the customer without your go-ahead.</p>
      </div>
    </div>
  );
}

export function InboxView({ conversationId }: { conversationId?: string }) {
  const { data: conversation } = useConversation(conversationId ?? "");
  const crumbs: (string | { label: string; href: string })[] = conversationId
    ? [{ label: "Inbox", href: "/dashboard/inbox" }, conversation ? contactLabel(conversation.customers) : "…"]
    : ["Inbox"];

  return (
    <PageShell crumbs={crumbs} width="max-w-[1400px]">
      <div className="grid h-[calc(100svh-8.5rem)] overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm lg:grid-cols-[340px_1fr]">
        <div className={cn("min-h-0 border-border/60 lg:border-r", conversationId && "hidden lg:block")}>
          <ConversationList activeId={conversationId} />
        </div>
        <div className={cn("min-h-0 min-w-0", !conversationId && "hidden lg:block")}>
          {conversationId ? (
            <ThreadPane conversationId={conversationId} />
          ) : (
            <EmptyState icon={BubbleChatIcon} title="Select a conversation" hint="Pick a thread on the left — replies you type send straight to the customer's WhatsApp." className="h-full" />
          )}
        </div>
      </div>
    </PageShell>
  );
}
