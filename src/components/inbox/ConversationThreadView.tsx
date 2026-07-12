"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { cn } from "@/lib/utils";
import { useConversation, useSendOwnerMessage } from "@/lib/query/conversations";
import { contactLabel } from "@/lib/utils/contact";

export function ConversationThreadView({ conversationId }: { conversationId: string }) {
  const { data: conversation, isLoading } = useConversation(conversationId);
  const sendMessage = useSendOwnerMessage(conversationId);
  const [draft, setDraft] = useState("");
  const [agentReply, setAgentReply] = useState("");
  const [agentRunning, setAgentRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  if (!conversation) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Conversation not found.</main>;

  return (
    <>
      <PageHeaderBar title="Conversation" backHref="/dashboard/inbox" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow="WhatsApp"
          title={contactLabel(conversation.customers)}
          description="Owner replies here send immediately. Agent drafts always wait for approval."
        />

        <Card className="mt-8 border-border/80">
          <CardContent className="max-h-[420px] space-y-4 overflow-y-auto p-5">
            {conversation.messages.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet.</p>}
            {conversation.messages.map((message) => (
              <div key={message.id} className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-xl px-4 py-2.5 text-sm", message.direction === "outbound" ? "bg-primary text-white" : "bg-muted")}>
                  <p>{message.body}</p>
                  <p className={cn("mt-1 text-[10px] uppercase tracking-wide", message.direction === "outbound" ? "text-white/70" : "text-muted-foreground")}>{message.sender} · {new Date(message.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {agentReply && (
          <Card className="mt-4 border-primary/30 bg-primary/[0.03]">
            <CardContent className="flex gap-3 p-4">
              <HugeiconsIcon icon={AiBrain01Icon} size={18} className="mt-0.5 shrink-0 text-primary" />
              <div><Badge variant="secondary" className="mb-2">Agent notes</Badge><p className="text-sm leading-6 whitespace-pre-wrap">{agentReply}</p></div>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          <Textarea placeholder="Type a reply…" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-3">
            <Button onClick={sendOwnerReply} disabled={sendMessage.isPending || !draft.trim()} className="btn-purple border-0">{sendMessage.isPending ? "Sending…" : "Send reply now"}</Button>
            <Button variant="outline" onClick={askAgent} disabled={agentRunning || !draft.trim()}>{agentRunning ? "Agent thinking…" : "Ask agent to draft"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Agent-drafted invoices or replies show up in Approvals, not here.</p>
        </div>
      </main>
    </>
  );
}
