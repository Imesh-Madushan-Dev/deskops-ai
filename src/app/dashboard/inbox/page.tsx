import type { Metadata } from "next";
import { InboxView } from "@/components/inbox/InboxView";

export const metadata: Metadata = { title: "Inbox — Deskops AI" };

export default function InboxPage() {
  return <InboxView />;
}
