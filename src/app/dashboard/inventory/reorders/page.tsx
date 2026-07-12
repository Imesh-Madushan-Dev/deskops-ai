"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useReorders, useUpdateReorderStatus } from "@/lib/query/inventory";

const statusVariant: Record<string, "secondary" | "outline" | "default"> = { suggested: "outline", ordered: "secondary", received: "default" };

export default function ReordersPage() {
  const { data: reorders, isLoading } = useReorders();
  const updateStatus = useUpdateReorderStatus();

  return (
    <>
      <PageHeaderBar title="Reorders" backHref="/dashboard/inventory" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="Suggested / ordered restocks" title="Reorder suggestions" description="Track supplier reorders from suggestion through delivery." />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Supplier</TableHead><TableHead>Quantity</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && reorders?.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No reorders yet.</TableCell></TableRow>}
                {reorders?.map((reorder) => (
                  <TableRow key={reorder.id}>
                    <TableCell className="font-medium">{reorder.products?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{reorder.suppliers?.name ?? "—"}</TableCell>
                    <TableCell>{reorder.quantity}</TableCell>
                    <TableCell><Badge variant={statusVariant[reorder.status] ?? "outline"} className="capitalize">{reorder.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {reorder.status === "suggested" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: reorder.id, status: "ordered" })}>Mark ordered</Button>}
                      {reorder.status === "ordered" && <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: reorder.id, status: "received" })}>Mark received</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
