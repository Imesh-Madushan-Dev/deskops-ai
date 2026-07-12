"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  return useQuery({ queryKey: qk.approvals, queryFn: () => fetch("/api/approvals").then((r) => json<Approval[]>(r)), refetchInterval: 15_000 });
}

export function useDecideApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      fetch(`/api/approvals/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => json(r)),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: qk.approvals });
      const prev = qc.getQueryData<Approval[]>(qk.approvals);
      qc.setQueryData<Approval[]>(qk.approvals, (old = []) => old.filter((a) => a.id !== id));
      return { prev };
    },
    onError: (_e, _vars, ctx) => qc.setQueryData(qk.approvals, ctx?.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.approvals });
      qc.invalidateQueries({ queryKey: qk.overview });
      qc.invalidateQueries({ queryKey: qk.products });
      qc.invalidateQueries({ queryKey: qk.invoices });
    },
  });
}
