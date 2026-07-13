"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageIntro, PageShell } from "@/components/dashboard/ui";
import { useCreateProduct } from "@/lib/query/products";

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    try {
      const product = await createProduct.mutateAsync({
        name: String(formData.get("name") ?? ""),
        sku: String(formData.get("sku") ?? "") || null,
        price: Number(formData.get("price") ?? 0),
        cost: formData.get("cost") ? Number(formData.get("cost")) : null,
        stockQty: Number(formData.get("stockQty") ?? 0),
        reorderLevel: Number(formData.get("reorderLevel") ?? 0),
        categoryName: String(formData.get("category") ?? "") || null,
        supplierName: String(formData.get("supplier") ?? "") || null,
        isActive: true,
      });
      router.push(`/dashboard/products/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create product.");
    }
  }

  return (
    <PageShell crumbs={[{ label: "Products", href: "/dashboard/products" }, "New"]} width="max-w-2xl">
      <PageIntro eyebrow="Create draft" title="Add a product" description="Prices and stock feed straight into your agents' quotes." />
        <Card className="border-border/80">
          <CardContent className="p-6">
            <form action={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
                <div className="space-y-1.5"><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="price">Price</Label><Input id="price" name="price" type="number" step="0.01" min="0" required /></div>
                <div className="space-y-1.5"><Label htmlFor="cost">Cost (optional)</Label><Input id="cost" name="cost" type="number" step="0.01" min="0" /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="stockQty">Stock quantity</Label><Input id="stockQty" name="stockQty" type="number" min="0" defaultValue={0} required /></div>
                <div className="space-y-1.5"><Label htmlFor="reorderLevel">Reorder level</Label><Input id="reorderLevel" name="reorderLevel" type="number" min="0" defaultValue={0} required /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="category">Category (optional)</Label><Input id="category" name="category" /></div>
                <div className="space-y-1.5"><Label htmlFor="supplier">Supplier (optional)</Label><Input id="supplier" name="supplier" /></div>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={createProduct.isPending} className="btn-purple border-0">{createProduct.isPending ? "Saving…" : "Save product"}</Button>
            </form>
          </CardContent>
        </Card>
    </PageShell>
  );
}
