"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { ReorderInput } from "@/lib/db/inventory";
import type { Product } from "./products";

type LowStockItem = { id: string; name: string; sku: string | null; stock_qty: number; reorder_level: number };
type StockMovement = { id: string; delta: number; reason: string; created_at: string; products: { name: string } | null };
export type Reorder = { id: string; quantity: number; status: string; created_at: string; products: { name: string; sku: string | null } | null; suppliers: { name: string } | null };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useInventory() {
  return useQuery({ queryKey: qk.inventory, queryFn: () => fetch("/api/inventory").then((r) => json<{ lowStock: LowStockItem[]; movements: StockMovement[] }>(r)) });
}

/** Patch one product's quantity in place, in the list and in its detail cache. */
function setStockQty(qc: ReturnType<typeof useQueryClient>, productId: string, qty: (current: number) => number) {
  qc.setQueryData<Product[]>(qk.products, (list) => list?.map((p) => (p.id === productId ? { ...p, stock_qty: qty(p.stock_qty) } : p)));
  qc.setQueryData<Product>(qk.product(productId), (p) => (p ? { ...p, stock_qty: qty(p.stock_qty) } : p));
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { productId: string; delta: number; reason: "restock" | "adjustment" }) =>
      fetch("/api/inventory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json<{ ok: true; stockQty: number }>(r)),

    // The number the owner just typed lands immediately on the one row that changed. Refetching the
    // whole product list and the 100-row movement feed before it moved is what made this feel slow.
    onMutate: async ({ productId, delta }) => {
      await qc.cancelQueries({ queryKey: qk.products });
      const previous = { list: qc.getQueryData<Product[]>(qk.products), one: qc.getQueryData<Product>(qk.product(productId)) };
      setStockQty(qc, productId, (current) => current + delta);
      return previous;
    },
    onError: (_error, { productId }, previous) => {
      if (!previous) return;
      qc.setQueryData(qk.products, previous.list);
      qc.setQueryData(qk.product(productId), previous.one);
    },
    onSuccess: ({ stockQty }, { productId }) => {
      // The server owns the resulting count — snap to it rather than trusting the local sum.
      setStockQty(qc, productId, () => stockQty);
      // Only what is genuinely derived server-side: the movement feed, and the low-stock counters the
      // overview shows. Both refetch only while their page is actually mounted.
      qc.invalidateQueries({ queryKey: qk.inventory });
      qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}

export function useReorders() {
  return useQuery({ queryKey: qk.reorders, queryFn: () => fetch("/api/reorders").then((r) => json<Reorder[]>(r)) });
}

export function useCreateReorder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReorderInput) => fetch("/api/reorders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.reorders }),
  });
}

export function useUpdateReorderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "ordered" | "received" }) =>
      fetch(`/api/reorders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then((r) => json<{ ok: true; productId: string | null; stockQty: number | null }>(r)),
    onSuccess: ({ productId, stockQty }) => {
      qc.invalidateQueries({ queryKey: qk.reorders });
      // "Ordered" moves no stock, so only a received delivery touches products at all — and then just
      // the one product, straight from the quantity the server returned.
      if (productId && stockQty !== null) {
        setStockQty(qc, productId, () => stockQty);
        qc.invalidateQueries({ queryKey: qk.inventory });
        qc.invalidateQueries({ queryKey: qk.overview });
      }
    },
  });
}
