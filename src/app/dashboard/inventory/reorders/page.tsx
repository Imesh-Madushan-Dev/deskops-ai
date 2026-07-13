"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { DeliveryTruck01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useReorders, useUpdateReorderStatus } from "@/lib/query/inventory";
import { EmptyState, PageIntro, PageShell, Panel, relativeTime, StatusPill } from "@/components/dashboard/ui";

const statusTone = { suggested: "warn", ordered: "brand", received: "ok" } as const;

export default function ReordersPage() {
  const { data: reorders, isLoading } = useReorders();
  const updateStatus = useUpdateReorderStatus();

  return (
    <PageShell crumbs={[{ label: "Inventory", href: "/dashboard/inventory" }, "Reorders"]} width="max-w-5xl">
      <PageIntro eyebrow="Restocking" title="Reorders" description="Track supplier restocks from the agent's suggestion through to delivery." />

      <Panel>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Product</TableHead>
              <TableHead className="hidden sm:table-cell">Supplier</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="hidden sm:table-cell">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
            {!isLoading && reorders?.length === 0 && (
              <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="p-0">
                <EmptyState icon={DeliveryTruck01Icon} title="No reorders yet" hint="Reorder a low-stock item from Inventory and it will show up here." />
              </TableCell></TableRow>
            )}
            {reorders?.map((reorder) => (
              <TableRow key={reorder.id}>
                <TableCell className="font-medium">{reorder.products?.name ?? "—"}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{reorder.suppliers?.name ?? "—"}</TableCell>
                <TableCell className="text-right font-mono tabular-nums">{reorder.quantity}</TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{relativeTime(reorder.created_at)}</TableCell>
                <TableCell><StatusPill tone={statusTone[reorder.status as keyof typeof statusTone] ?? "neutral"} dot={false}>{reorder.status}</StatusPill></TableCell>
                <TableCell className="text-right">
                  {reorder.status === "suggested" && <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: reorder.id, status: "ordered" })}>Mark ordered</Button>}
                  {reorder.status === "ordered" && <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs" disabled={updateStatus.isPending} onClick={() => updateStatus.mutate({ id: reorder.id, status: "received" })}>Mark received</Button>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Panel>
    </PageShell>
  );
}
