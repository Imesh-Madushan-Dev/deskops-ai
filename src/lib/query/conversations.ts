"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";

export type Conversation = { id: string; status: "open" | "snoozed" | "closed"; last_message_at: string | null; customers: { name: string | null; whatsapp_number: string } | null };
export type Message = { id: string; direction: "inbound" | "outbound"; sender: "customer" | "agent" | "owner"; body: string; media_url: string | null; created_at: string };
export type ConversationDetail = Conversation & { messages: Message[] };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useConversations() {
  return useQuery({ queryKey: qk.conversations, queryFn: () => fetch("/api/conversations").then((r) => json<Conversation[]>(r)) });
}

export function useConversation(id: string) {
  return useQuery({ queryKey: qk.conversation(id), queryFn: () => fetch(`/api/conversations/${id}`).then((r) => json<ConversationDetail>(r)), enabled: Boolean(id) });
}

export function useSendOwnerMessage(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => fetch(`/api/conversations/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body }) }).then((r) => json<Message>(r)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.conversation(id) });
      qc.invalidateQueries({ queryKey: qk.conversations });
      qc.invalidateQueries({ queryKey: qk.overview }); // inbox badge reflects the reply
    },
  });
}
