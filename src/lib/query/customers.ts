"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { CustomerInput } from "@/lib/db/customers";

export type Customer = { id: string; name: string | null; whatsapp_number: string; email: string | null; notes: string | null; created_at: string };
export type CustomerDetail = Customer & {
  invoices: { id: string; number: string; status: string; total: number; created_at: string }[];
  conversations: { id: string; status: string; last_message_at: string | null }[];
};

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useCustomers() {
  return useQuery({ queryKey: qk.customers, queryFn: () => fetch("/api/customers").then((r) => json<Customer[]>(r)) });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: qk.customer(id), queryFn: () => fetch(`/api/customers/${id}`).then((r) => json<CustomerDetail>(r)), enabled: Boolean(id) });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CustomerInput) => fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json<Customer>(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.customers }),
  });
}

export function useUpdateCustomer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CustomerInput>) => fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json<Customer>(r)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.customers });
      qc.invalidateQueries({ queryKey: qk.customer(id) });
    },
  });
}
