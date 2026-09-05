"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro, PageShell } from "@/components/dashboard/ui";
import { useArchiveProduct, useProduct, useUpdateProduct } from "@/lib/query/products";
import { StockAdjustDialog, type AdjustTarget } from "@/components/inventory/StockAdjustDialog";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";

export function ProductDetailView({ productId }: { productId: string }) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(productId);
  const { data: overview } = useDashboardOverview();
  const update = useUpdateProduct(productId);
  const archive = useArchiveProduct();
  const [adjusting, setAdjusting] = useState<AdjustTarget | null>(null);
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
        imageUrl: String(formData.get("imageUrl") ?? "") || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update product.");
    }
  }

  if (isLoading) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Loading…</main>;
  if (!product) return <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">Product not found.</main>;

  return (
    <PageShell crumbs={[{ label: "Products", href: "/dashboard/products" }, product.name]} width="max-w-3xl">
      <PageIntro eyebrow={product.sku ?? "No SKU"} title={product.name} description="Prices and reorder rules used by your agents when quoting customers." />

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
              <div className="space-y-1.5">
                <Label htmlFor="imageUrl">Image URL</Label>
                <div className="flex items-center gap-3">
                  {product.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={product.image_url} alt={product.name} className="size-12 shrink-0 rounded-md border border-border object-cover" />
                  )}
                  <Input id="imageUrl" name="imageUrl" type="url" placeholder="https://…" defaultValue={product.image_url ?? ""} />
                </div>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={update.isPending} className="btn-purple border-0">{update.isPending ? "Saving…" : "Save changes"}</Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={archive.isPending || !product.is_active}
                  onClick={() => archive.mutate(productId, { onSuccess: () => router.push("/dashboard/products") })}
                >
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
            <div className="mt-5">
              <Button variant="outline" onClick={() => setAdjusting({ id: product.id, name: product.name, stock_qty: product.stock_qty })}>
                <HugeiconsIcon icon={PencilEdit02Icon} size={16} /> Update stock
              </Button>
            </div>
          </CardContent>
        </Card>
      <StockAdjustDialog target={adjusting} onOpenChange={(open) => !open && setAdjusting(null)} />
    </PageShell>
  );
}
