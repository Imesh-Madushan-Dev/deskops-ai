"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useConversations } from "@/lib/query/conversations";

export default function InboxPage() {
  const { data: conversations, isLoading } = useConversations();

  return (
    <>
      <PageHeaderBar title="Inbox" />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow={`${conversations?.length ?? 0} conversations`} title="Customer inbox" description="Customer messages, agent drafts, and grounded context in one place." />

        <Card className="mt-8 overflow-hidden border-border/80">
          <CardContent className="divide-y divide-border/70 p-0">
            {isLoading && <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && conversations?.length === 0 && <p className="px-6 py-10 text-center text-sm text-muted-foreground">No conversations yet — they&apos;ll appear here once a customer messages you.</p>}
            {conversations?.map((conversation) => (
              <Link key={conversation.id} href={`/dashboard/inbox/${conversation.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/40 sm:px-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={WhatsappIcon} size={19} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{conversation.customers?.name ?? conversation.customers?.whatsapp_number ?? "Unknown"}</p>
                  <p className="mt-1 truncate text-sm text-muted-foreground capitalize">{conversation.status}</p>
                </div>
                {conversation.last_message_at && <Badge variant="secondary" className="rounded-md">{new Date(conversation.last_message_at).toLocaleDateString()}</Badge>}
              </Link>
            ))}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
