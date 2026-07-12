import { ConversationThreadView } from "@/components/inbox/ConversationThreadView";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <ConversationThreadView conversationId={conversationId} />;
}
