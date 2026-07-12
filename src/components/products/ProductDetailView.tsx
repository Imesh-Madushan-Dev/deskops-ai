"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useArchiveProduct, useProduct, useUpdateProduct } from "@/lib/query/products";
import { useAdjustStock } from "@/lib/query/inventory";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";

export function ProductDetailView({ productId }: { productId: string }) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(productId);
  const { data: overview } = useDashboardOverview();
  const update = useUpdateProduct(productId);
  const archive = useArchiveProduct();
  const adjustStock = useAdjustStock();
  const [error, setError] = useState<string | null>(null);
  const currency = overview?.business.currency ?? "LKR";

  async function submit(formData: FormData) {
    setError(null);
    try {
      await update.mutateAsync({
        name: String(formData.get("name") ?? ""),
        sku: String(formData.get("sku") ?? "") || null,
        price: Number(formData.get("price") ?? 0),
        reorderLevel: Number(formData.get("reorderLevel") ?? 0),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update product.");
    }
  }

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  if (!product) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Product not found.</main>;

  return (
    <>
      <PageHeaderBar title="Product" backHref="/dashboard/products" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow={product.sku ?? "No SKU"} title={product.name} description="Prices and reorder rules used by your agents when quoting customers." />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-6">
            <form action={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" defaultValue={product.name} required /></div>
                <div className="space-y-1.5"><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" defaultValue={product.sku ?? ""} /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="price">Price</Label><Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={product.price} required /></div>
                <div className="space-y-1.5"><Label htmlFor="reorderLevel">Reorder level</Label><Input id="reorderLevel" name="reorderLevel" type="number" min="0" defaultValue={product.reorder_level} required /></div>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={update.isPending} className="btn-purple border-0">{update.isPending ? "Saving…" : "Save changes"}</Button>
                <Button type="button" variant="outline" disabled={archive.isPending} onClick={() => archive.mutate(productId, { onSuccess: () => router.push("/dashboard/products") })}>
                  {product.is_active ? "Archive product" : "Archived"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/80">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current stock</p>
                <p className="mt-1 text-2xl font-semibold">{product.stock_qty} <span className="text-sm font-normal text-muted-foreground">· {formatMoney(product.price, currency)} each</span></p>
              </div>
              <Badge variant={product.stock_qty <= product.reorder_level ? "destructive" : "secondary"}>{product.stock_qty <= product.reorder_level ? "Low stock" : "Healthy"}</Badge>
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" onClick={() => adjustStock.mutate({ productId, delta: 1, reason: "adjustment" })}>+1</Button>
              <Button variant="outline" onClick={() => adjustStock.mutate({ productId, delta: -1, reason: "adjustment" })} disabled={product.stock_qty <= 0}>-1</Button>
              <Button variant="outline" onClick={() => adjustStock.mutate({ productId, delta: 10, reason: "restock" })}>+10 (restock)</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
