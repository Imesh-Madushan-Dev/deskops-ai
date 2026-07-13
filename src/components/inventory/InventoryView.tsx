"use client";

import Link from "next/link";
import { useMemo } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowDataTransferHorizontalIcon, DeliveryTruck01Icon, PackageIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCreateReorder, useInventory, useReorders } from "@/lib/query/inventory";
import { EmptyState, PageIntro, PageShell, Panel, relativeTime, StatCard, StatusPill } from "@/components/dashboard/ui";

export function InventoryView() {
  const { data, isLoading } = useInventory();
  const { data: reorders } = useReorders();
  const createReorder = useCreateReorder();

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      low: data?.lowStock.length ?? 0,
      out: data?.lowStock.filter((i) => i.stock_qty === 0).length ?? 0,
      movesToday: data?.movements.filter((m) => new Date(m.created_at).toDateString() === today).length ?? 0,
      openReorders: reorders?.filter((r) => r.status !== "received").length ?? 0,
    };
  }, [data, reorders]);

  return (
    <PageShell
      crumbs={["Inventory"]}
      actions={<Link href="/dashboard/inventory/reorders"><Button variant="outline" className="h-9 rounded-lg px-4 text-sm"><HugeiconsIcon icon={DeliveryTruck01Icon} size={16} /> Reorders</Button></Link>}
    >
      <PageIntro eyebrow="Stock control" title="Inventory" description="The Inventory agent watches these numbers — reorder before an item runs out." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Low stock" value={stats.low} hint="at or below reorder level" icon={AlertCircleIcon} tone={stats.low > 0 ? "brand" : "default"} />
        <StatCard label="Out of stock" value={stats.out} hint="zero on hand" icon={PackageIcon} />
        <StatCard label="Movements today" value={stats.movesToday} hint="sales, restocks, adjustments" icon={ArrowDataTransferHorizontalIcon} />
        <StatCard label="Open reorders" value={stats.openReorders} hint="suggested or ordered" icon={DeliveryTruck01Icon} href="/dashboard/inventory/reorders" />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Low stock" sub="At or below reorder level — one tap creates a reorder">
          <div className="divide-y divide-border/60">
            {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && data?.lowStock.length === 0 && <EmptyState icon={PackageIcon} title="Stock is healthy" hint="Nothing is at its reorder level right now." className="py-10" />}
            {data?.lowStock.map((item) => {
              const pct = Math.min(100, Math.round((item.stock_qty / Math.max(item.reorder_level, 1)) * 100));
              return (
                <div key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <span className={cn("font-mono text-xs tabular-nums", item.stock_qty === 0 ? "font-semibold text-destructive" : "text-muted-foreground")}>{item.stock_qty} / {item.reorder_level}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className={cn("block h-full rounded-full", item.stock_qty === 0 ? "bg-destructive" : "bg-chart-2")} style={{ width: `${Math.max(pct, 4)}%` }} />
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg text-xs" disabled={createReorder.isPending} onClick={() => createReorder.mutate({ productId: item.id, quantity: Math.max(item.reorder_level * 2, 10) })}>
                    Reorder
                  </Button>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Stock movements" sub="Every change, straight from the ledger">
          <div className="max-h-105 divide-y divide-border/60 overflow-y-auto">
            {data?.movements.length === 0 && <EmptyState icon={ArrowDataTransferHorizontalIcon} title="No movements yet" hint="Sales and restocks will appear here as they happen." className="py-10" />}
            {data?.movements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-semibold tabular-nums", m.delta < 0 ? "bg-destructive/10 text-destructive" : "bg-[#047857]/10 text-[#047857]")}>
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.products?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(m.created_at)}</p>
                </div>
                <StatusPill tone="neutral" dot={false}>{m.reason}</StatusPill>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </PageShell>
  );
}
