"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { LedgerEntryInput } from "@/lib/db/ledger";

export type LedgerEntry = { id: string; entry_type: "income" | "expense"; amount: number; category: string; occurred_at: string };
export type BooksSummary = { income: number; expense: number; net: number; byCategory: { category: string; amount: number }[] };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useLedgerEntries() {
  return useQuery({ queryKey: qk.ledger, queryFn: () => fetch("/api/books").then((r) => json<LedgerEntry[]>(r)) });
}

export function useBooksReport(range?: { from: string; to: string }) {
  const params = range ? `?from=${range.from}&to=${range.to}` : "";
  return useQuery({ queryKey: [...qk.ledger, "report", range ?? "default"], queryFn: () => fetch(`/api/books/reports${params}`).then((r) => json<BooksSummary>(r)) });
}

export function useCreateLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LedgerEntryInput) => fetch("/api/books", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ledger }),
  });
}
