import { InboxView } from "@/components/inbox/InboxView";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <InboxView conversationId={conversationId} />;
}
