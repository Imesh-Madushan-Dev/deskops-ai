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
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
