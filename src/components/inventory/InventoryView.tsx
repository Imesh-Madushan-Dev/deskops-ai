"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowDataTransferHorizontalIcon, DeliveryTruck01Icon, PackageIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useCreateReorder, useInventory, useReorders } from "@/lib/query/inventory";
import { useProducts } from "@/lib/query/products";
import { EmptyState, FilterChips, PageIntro, PageShell, Panel, relativeTime, SearchField, StatCard, StatusPill } from "@/components/dashboard/ui";
import { StockAdjustDialog, type AdjustTarget } from "./StockAdjustDialog";

/** Movement reasons are written by the agents as well as by hand, so spell out what each means. */
const REASON_HINTS: Record<string, string> = {
  sale: "Sold to a customer",
  restock: "A delivery was received",
  adjustment: "Corrected by hand",
  reorder: "Received against a reorder",
};

export function InventoryView() {
  const { data, isLoading } = useInventory();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: reorders } = useReorders();
  const createReorder = useCreateReorder();
  const [adjusting, setAdjusting] = useState<AdjustTarget | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "low">("all");

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      low: data?.lowStock.length ?? 0,
      out: data?.lowStock.filter((i) => i.stock_qty === 0).length ?? 0,
      movesToday: data?.movements.filter((m) => new Date(m.created_at).toDateString() === today).length ?? 0,
      openReorders: reorders?.filter((r) => r.status !== "received").length ?? 0,
    };
  }, [data, reorders]);

  const active = useMemo(() => (products ?? []).filter((p) => p.is_active), [products]);

  // One list for every active product, not just the low ones — updating a healthy count after a
  // stocktake is the same job, and hiding it on the product page is what made this page unusable.
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return active
      .filter((p) => (filter === "low" ? p.stock_qty <= p.reorder_level : true))
      .filter((p) => (term ? `${p.name} ${p.sku ?? ""}`.toLowerCase().includes(term) : true))
      .sort((a, b) => a.stock_qty - b.stock_qty);
  }, [active, search, filter]);

  const lowCount = active.filter((p) => p.stock_qty <= p.reorder_level).length;

  return (
    <PageShell
      crumbs={["Inventory"]}
      actions={
        <Link href="/dashboard/inventory/reorders">
          <Button variant="outline" className="h-9 rounded-lg px-4 text-sm">
            <HugeiconsIcon icon={DeliveryTruck01Icon} size={16} /> Reorders
          </Button>
        </Link>
      }
    >
      <PageIntro
        eyebrow="Stock control"
        title="Inventory"
        description="Update a count when a delivery arrives or a stocktake disagrees. The Inventory agent watches these numbers and flags what to reorder."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Low stock" value={stats.low} hint="at or below reorder level" icon={AlertCircleIcon} tone={stats.low > 0 ? "brand" : "default"} />
        <StatCard label="Out of stock" value={stats.out} hint="zero on hand" icon={PackageIcon} />
        <StatCard label="Movements today" value={stats.movesToday} hint="sales, restocks, adjustments" icon={ArrowDataTransferHorizontalIcon} />
        <StatCard label="Open reorders" value={stats.openReorders} hint="suggested or ordered" icon={DeliveryTruck01Icon} href="/dashboard/inventory/reorders" />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel
          title="Stock levels"
          sub="Update a count, or draft a reorder for anything running low"
          action={<SearchField value={search} onChange={setSearch} placeholder="Search name or SKU…" className="w-44 sm:w-56" />}
        >
          <div className="px-5 pb-1 pt-3">
            <FilterChips
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: active.length },
                { value: "low", label: "Low stock", count: lowCount },
              ]}
            />
          </div>
          <div className="max-h-140 divide-y divide-border/60 overflow-y-auto">
            {productsLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
            {!productsLoading && rows.length === 0 && (
              <EmptyState
                icon={PackageIcon}
                title={search ? "No matches" : filter === "low" ? "Stock is healthy" : "No products yet"}
                hint={search ? "Try a different search." : filter === "low" ? "Nothing is at its reorder level right now." : "Add a product before you can track its stock."}
                className="py-10"
              />
            )}
            {rows.map((item) => {
              const low = item.stock_qty <= item.reorder_level;
              const pct = low ? Math.min(100, Math.round((item.stock_qty / Math.max(item.reorder_level, 1)) * 100)) : 100;
              const reorderQty = Math.max(item.reorder_level * 2, 10);
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`/dashboard/products/${item.id}`} className="truncate text-sm font-medium hover:text-primary">
                        {item.name}
                      </Link>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              "shrink-0 cursor-help font-mono text-xs tabular-nums",
                              item.stock_qty === 0 ? "font-semibold text-destructive" : low ? "text-destructive" : "text-muted-foreground",
                            )}
                          >
                            {item.stock_qty} / {item.reorder_level}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          {item.stock_qty} on hand · reorder level {item.reorder_level}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    {/* Only for low items, where the bar says how far below the line it has fallen.
                        A healthy item's bar is always full, which is a row of noise. */}
                    {low && (
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                        <span
                          className={cn("block h-full rounded-full", item.stock_qty === 0 ? "bg-destructive" : "bg-destructive/70")}
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 shrink-0 rounded-lg px-2.5 text-xs" onClick={() => setAdjusting(item)}>
                        <HugeiconsIcon icon={PencilEdit02Icon} size={14} /> Update
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Receive, remove, or set the counted quantity</TooltipContent>
                  </Tooltip>

                  {low && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shrink-0 rounded-lg text-xs"
                          disabled={createReorder.isPending}
                          onClick={() =>
                            createReorder.mutate(
                              { productId: item.id, quantity: reorderQty },
                              {
                                onSuccess: () => toast.success(`Reorder drafted — ${reorderQty} × ${item.name}`),
                                onError: (error) => toast.error(error instanceof Error ? error.message : "Couldn't create the reorder."),
                              },
                            )
                          }
                        >
                          Reorder
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Draft a reorder for {reorderQty} units — twice the reorder level</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Stock movements" sub="Every change, straight from the ledger">
          <div className="max-h-140 divide-y divide-border/60 overflow-y-auto">
            {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && data?.movements.length === 0 && (
              <EmptyState icon={ArrowDataTransferHorizontalIcon} title="No movements yet" hint="Sales and restocks will appear here as they happen." className="py-10" />
            )}
            {data?.movements.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className={cn(
                        "flex size-8 shrink-0 cursor-help items-center justify-center rounded-lg font-mono text-xs font-semibold tabular-nums",
                        m.delta < 0 ? "bg-destructive/10 text-destructive" : "bg-[#047857]/10 text-[#047857]",
                      )}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{m.delta > 0 ? `${m.delta} added` : `${Math.abs(m.delta)} removed`}</TooltipContent>
                </Tooltip>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.products?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{relativeTime(m.created_at)}</p>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">
                      <StatusPill tone="neutral" dot={false}>
                        {m.reason}
                      </StatusPill>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{REASON_HINTS[m.reason] ?? m.reason}</TooltipContent>
                </Tooltip>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <StockAdjustDialog target={adjusting} onOpenChange={(open) => !open && setAdjusting(null)} />
    </PageShell>
  );
}
