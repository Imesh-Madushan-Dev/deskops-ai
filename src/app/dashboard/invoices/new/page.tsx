"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useCreateInvoice } from "@/lib/query/invoices";
import { useCustomers } from "@/lib/query/customers";
import { useProducts } from "@/lib/query/products";

type Line = { productId?: string; description: string; quantity: number; unitPrice: number };

export default function NewInvoicePage() {
  const router = useRouter();
  const { data: customers } = useCustomers();
  const { data: products } = useProducts();
  const createInvoice = useCreateInvoice();
  const [customerId, setCustomerId] = useState<string>("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [error, setError] = useState<string | null>(null);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  function pickProduct(index: number, productId: string) {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;
    updateLine(index, { productId, description: product.name, unitPrice: product.price });
  }

  async function submit() {
    setError(null);
    const validLines = lines.filter((l) => l.description.trim() && l.quantity > 0);
    if (!validLines.length) { setError("Add at least one line item."); return; }
    try {
      const invoice = await createInvoice.mutateAsync({ customerId: customerId || null, taxRate: 0, items: validLines });
      router.push(`/dashboard/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create invoice.");
    }
  }

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);

  return (
    <>
      <PageHeaderBar title="New invoice" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="Create draft" title="New invoice" description="Totals are computed from your catalog — never typed in by hand." />

        <Card className="mt-8 border-border/80">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-1.5">
              <Label>Customer (optional)</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Walk-in / no customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name ?? c.whatsapp_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Line items</Label>
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1.4fr_1fr_0.7fr_0.7fr_auto] items-end gap-2 rounded-lg border border-border/70 p-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Product</Label>
                    <Select value={line.productId} onValueChange={(v) => pickProduct(index, v)}>
                      <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Custom" /></SelectTrigger>
                      <SelectContent>{products?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Description</Label><Input className="h-9" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Qty</Label><Input className="h-9" type="number" min={1} value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} /></div>
                  <div className="space-y-1"><Label className="text-xs text-muted-foreground">Unit price</Label><Input className="h-9" type="number" min={0} step="0.01" value={line.unitPrice} onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })} /></div>
                  <Button type="button" variant="outline" size="icon" onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))} disabled={lines.length === 1}>
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => setLines((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}>
                <HugeiconsIcon icon={Add01Icon} size={16} /> Add line
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{total.toFixed(2)}</span>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button onClick={submit} disabled={createInvoice.isPending} className="btn-purple border-0">{createInvoice.isPending ? "Creating…" : "Create draft invoice"}</Button>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
