"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "./keys";

export type Approval = {
  id: string;
  action_type: "send_message" | "send_invoice" | "mark_invoice_paid" | "reorder";
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
  expires_at: string;
};

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useApprovals() {
  return useQuery({ queryKey: qk.approvals, queryFn: () => fetch("/api/approvals").then((r) => json<Approval[]>(r)) });
}

type Decision = { id: string; action: "approve" | "reject"; actionType: Approval["action_type"] };

/** Approving a send_invoice renders the invoice image and uploads it to WAHA before the request
 *  returns, so a decision can take seconds. The row is removed optimistically and each decision is
 *  independent — the page must stay usable while one is in flight. */
export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: Decision) =>
      fetch(`/api/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => json(r)),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: qk.approvals });
      const prev = qc.getQueryData<Approval[]>(qk.approvals);
      qc.setQueryData<Approval[]>(qk.approvals, (old = []) => old.filter((a) => a.id !== id));
      return { prev };
    },
    onSuccess: (_data, { action }) => toast.success(action === "approve" ? "Approved and sent" : "Rejected"),
    // Put the row back exactly where it was rather than refetching the whole queue.
    onError: (error, _vars, ctx) => {
      qc.setQueryData(qk.approvals, ctx?.prev);
      toast.error(error instanceof Error ? error.message : "Couldn't complete that action.");
    },
    onSettled: (_data, _error, { action, actionType }) => {
      qc.invalidateQueries({ queryKey: qk.approvals });
      qc.invalidateQueries({ queryKey: qk.overview });
      // Only refetch what this decision could have changed — invalidating products and invoices on
      // every decision made unrelated parts of the app reload for a rejected message.
      if (action === "approve") {
        if (actionType === "reorder") qc.invalidateQueries({ queryKey: qk.products });
        if (actionType === "send_invoice" || actionType === "mark_invoice_paid") {
          qc.invalidateQueries({ queryKey: qk.invoices });
          if (actionType === "mark_invoice_paid") qc.invalidateQueries({ queryKey: qk.products });
        }
      }
    },
  });
}
