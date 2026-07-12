"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useCreateReorder, useInventory } from "@/lib/query/inventory";

export function InventoryView() {
  const { data, isLoading } = useInventory();
  const createReorder = useCreateReorder();

  return (
    <>
      <PageHeaderBar title="Inventory" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow="Stock control"
          title="Inventory"
          description="Monitor stock levels and reorder before an item runs out."
          action={<Link href="/dashboard/inventory/reorders"><Button variant="outline" className="h-10 rounded-md px-4">View reorders</Button></Link>}
        />

        <section className="mt-8 grid gap-7 lg:grid-cols-2">
          <Card className="border-border/80">
            <CardContent className="p-0">
              <div className="border-b border-border/70 px-5 py-4 sm:px-6"><h2 className="font-semibold">Low stock</h2><p className="mt-1 text-xs text-muted-foreground">At or below reorder level</p></div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Stock</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                  {!isLoading && data?.lowStock.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Nothing low on stock.</TableCell></TableRow>}
                  {data?.lowStock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="destructive">{item.stock_qty}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={createReorder.isPending} onClick={() => createReorder.mutate({ productId: item.id, quantity: Math.max(item.reorder_level * 2, 10) })}>
                          Reorder
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="p-0">
              <div className="border-b border-border/70 px-5 py-4 sm:px-6"><h2 className="font-semibold">Recent stock movements</h2><p className="mt-1 text-xs text-muted-foreground">Last 100 changes</p></div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Change</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.movements.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">No movements yet.</TableCell></TableRow>}
                  {data?.movements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>{m.products?.name ?? "—"}</TableCell>
                      <TableCell className={m.delta < 0 ? "text-destructive" : "text-[#047857]"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</TableCell>
                      <TableCell className="capitalize text-muted-foreground">{m.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
