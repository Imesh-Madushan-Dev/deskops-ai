"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useProducts } from "@/lib/query/products";
import { formatMoney } from "@/lib/utils/money";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { ProductFormDialog } from "./ProductFormDialog";

export function ProductsView() {
  const { data: products, isLoading } = useProducts();
  const { data: overview } = useDashboardOverview();
  const [open, setOpen] = useState(false);
  const currency = overview?.business.currency ?? "LKR";

  return (
    <>
      <PageHeaderBar title="Products" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow={`${products?.length ?? 0} products`}
          title="Product catalog"
          description="Prices, stock, and supplier details are always ready for your agents."
          action={<Button className="btn-purple h-10 rounded-md border-0 px-4" onClick={() => setOpen(true)}><HugeiconsIcon icon={Add01Icon} size={17} /> Add product</Button>}
        />

        <Card className="mt-8 overflow-hidden border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && products?.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No products yet — add your first one.</TableCell></TableRow>}
                {products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium"><Link href={`/dashboard/products/${product.id}`} className="hover:text-primary">{product.name}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{product.sku ?? "—"}</TableCell>
                    <TableCell>{formatMoney(product.price, currency)}</TableCell>
                    <TableCell className={product.stock_qty <= product.reorder_level ? "text-destructive" : ""}>{product.stock_qty}</TableCell>
                    <TableCell><Badge variant={product.is_active ? "secondary" : "outline"}>{product.is_active ? "Active" : "Archived"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <ProductFormDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
