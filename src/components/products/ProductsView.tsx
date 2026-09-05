"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, DollarCircleIcon, PackageIcon, PencilEdit02Icon, TagIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProducts } from "@/lib/query/products";
import { formatMoney } from "@/lib/utils/money";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { cn } from "@/lib/utils";
import { EmptyState, PageIntro, PageShell, Panel, SearchField, StatCard, StatusPill } from "@/components/dashboard/ui";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StockAdjustDialog, type AdjustTarget } from "@/components/inventory/StockAdjustDialog";
import { ProductFormDialog } from "./ProductFormDialog";

export function ProductsView() {
  const { data: products, isLoading } = useProducts();
  const { data: overview } = useDashboardOverview();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get("new") === "1");
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<AdjustTarget | null>(null);
  const currency = overview?.business.currency ?? "LKR";

  const stats = useMemo(() => {
    const list = products ?? [];
    return {
      total: list.length,
      active: list.filter((p) => p.is_active).length,
      low: list.filter((p) => p.stock_qty <= p.reorder_level).length,
      value: list.reduce((sum, p) => sum + p.price * p.stock_qty, 0),
      categories: new Set(list.map((p) => p.product_categories?.name).filter(Boolean)).size,
    };
  }, [products]);

  const filtered = (products ?? []).filter((p) => `${p.name} ${p.sku ?? ""} ${p.product_categories?.name ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <PageShell
      crumbs={["Products"]}
      actions={<Button className="btn-purple h-9 rounded-lg border-0 px-4 text-sm" onClick={() => setOpen(true)}><HugeiconsIcon icon={Add01Icon} size={16} /> Add product</Button>}
    >
      <PageIntro eyebrow="Catalog" title="Products" description="Prices, stock, and supplier details — the ground truth your agents quote from." />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={stats.total} hint={`${stats.active} active`} icon={PackageIcon} />
        <StatCard label="Stock value" value={formatMoney(stats.value, currency)} hint="price × on-hand qty" icon={DollarCircleIcon} tone="brand" />
        <StatCard label="Low stock" value={stats.low} hint="at or below reorder level" icon={PackageIcon} href="/dashboard/inventory" />
        <StatCard label="Categories" value={stats.categories} hint="in use" icon={TagIcon} />
      </section>

      <Panel className="mt-6" title="Catalog" action={<SearchField value={search} onChange={setSearch} placeholder="Search name, SKU, category…" className="w-56 sm:w-72" />}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">SKU</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="pl-8 text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10 text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={7} className="p-0">
                <EmptyState icon={PackageIcon} title={search ? "No matches" : "No products yet"} hint={search ? "Try a different search." : "Add your first product so the agents can quote real prices."} action={!search ? <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Add product</Button> : undefined} />
              </TableCell></TableRow>
            )}
            {filtered.map((product) => {
              const low = product.stock_qty <= product.reorder_level;
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/products/${product.id}`} className="flex items-center gap-2.5 hover:text-primary">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image_url} alt="" className="size-8 shrink-0 rounded-md border border-border object-cover" />
                      ) : (
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground"><HugeiconsIcon icon={PackageIcon} size={14} /></span>
                      )}
                      {product.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{product.sku ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{product.product_categories?.name ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{formatMoney(product.price, currency)}</TableCell>
                  <TableCell className="pl-8 text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn("cursor-help font-mono text-sm tabular-nums", low && "font-semibold text-destructive")}>{product.stock_qty}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {product.stock_qty} on hand · reorder level {product.reorder_level}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell><StatusPill tone={product.is_active ? "ok" : "neutral"} dot={false}>{product.is_active ? "Active" : "Archived"}</StatusPill></TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost" className="size-8 p-0" onClick={() => setAdjusting(product)}>
                          <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                          <span className="sr-only">Update stock for {product.name}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Update stock</TooltipContent>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>
      <ProductFormDialog open={open} onOpenChange={setOpen} />
      <StockAdjustDialog target={adjusting} onOpenChange={(v) => !v && setAdjusting(null)} />
    </PageShell>
  );
}
