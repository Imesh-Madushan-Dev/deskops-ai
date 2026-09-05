import { redirect } from "next/navigation";

/** Threads open in place on the inbox now; this keeps old links and bookmarks working. */
export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  redirect(`/dashboard/inbox?c=${conversationId}`);
}
