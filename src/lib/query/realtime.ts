"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./keys";

// Which query keys go stale when a table changes. Prefix matching means
// ["invoices"] also invalidates ["invoices", id] detail queries.
const tableKeys: Record<string, readonly (readonly string[])[]> = {
  approvals: [qk.approvals, qk.overview],
  messages: [qk.conversations, qk.overview],
  conversations: [qk.conversations, qk.overview],
  customers: [qk.customers, qk.overview],
  invoices: [qk.invoices, qk.overview, qk.ledger],
  products: [qk.products, qk.inventory, qk.overview],
  ledger_entries: [qk.ledger, qk.overview],
  stock_movements: [qk.inventory],
  reorders: [qk.reorders, qk.inventory],
};

/**
 * Replaces interval polling: one Realtime channel invalidates the relevant
 * TanStack Query caches when the database changes. Mounted once in the shell.
 */
export function useRealtimeSync() {
  const qc = useQueryClient();
  useEffect(() => {
    const supabase = createClient();
    let channel = supabase.channel("db-sync");
    for (const [table, keys] of Object.entries(tableKeys)) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        for (const key of keys) qc.invalidateQueries({ queryKey: key });
      });
    }
    // A failed subscription is otherwise silent: the app keeps rendering stale data and every
    // panel needs a manual refresh, which is exactly how an empty publication went unnoticed.
    channel.subscribe((status) => {
      if (status !== "SUBSCRIBED" && status !== "CLOSED") {
        console.warn(`[realtime] channel ${status} — the dashboard will not live-update.`);
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
