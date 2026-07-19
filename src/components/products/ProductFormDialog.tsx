"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProduct } from "@/lib/query/products";

export function ProductFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createProduct = useCreateProduct();
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    try {
      await createProduct.mutateAsync({
        name: String(formData.get("name") ?? ""),
        sku: String(formData.get("sku") ?? "") || null,
        price: Number(formData.get("price") ?? 0),
        cost: formData.get("cost") ? Number(formData.get("cost")) : null,
        stockQty: Number(formData.get("stockQty") ?? 0),
        reorderLevel: Number(formData.get("reorderLevel") ?? 0),
        imageUrl: String(formData.get("imageUrl") ?? "") || null,
        categoryName: String(formData.get("category") ?? "") || null,
        supplierName: String(formData.get("supplier") ?? "") || null,
        isActive: true,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create product.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add product</DialogTitle></DialogHeader>
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
          <div className="space-y-1.5"><Label htmlFor="imageUrl">Image URL (optional)</Label><Input id="imageUrl" name="imageUrl" type="url" placeholder="https://…" /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={createProduct.isPending} className="btn-purple border-0">{createProduct.isPending ? "Saving…" : "Save product"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
