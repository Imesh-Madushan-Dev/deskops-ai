"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { InvoiceInput } from "@/lib/db/invoices";

export type Invoice = {
  id: string;
  number: string;
  status: "draft" | "sent" | "paid" | "void";
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  customers: { name: string | null; whatsapp_number: string } | null;
};
export type InvoiceDetail = Invoice & { items: { id: string; description: string; quantity: number; unit_price: number; line_total: number }[] };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useInvoices() {
  return useQuery({ queryKey: qk.invoices, queryFn: () => fetch("/api/invoices").then((r) => json<Invoice[]>(r)) });
}

export function useInvoice(id: string) {
  return useQuery({ queryKey: qk.invoice(id), queryFn: () => fetch(`/api/invoices/${id}`).then((r) => json<InvoiceDetail>(r)), enabled: Boolean(id) });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InvoiceInput) => fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json<Invoice>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.invoices }),
  });
}

export function useInvoiceAction(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "send" | "record_sale" | "void") =>
      fetch(`/api/invoices/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => json<InvoiceDetail>(r)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.invoices });
      qc.invalidateQueries({ queryKey: qk.invoice(id) });
      qc.invalidateQueries({ queryKey: qk.products });
      qc.invalidateQueries({ queryKey: qk.ledger });
      qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}
