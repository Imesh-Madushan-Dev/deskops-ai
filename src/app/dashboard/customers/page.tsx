"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useCreateCustomer, useCustomers } from "@/lib/query/customers";

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    try {
      await createCustomer.mutateAsync({
        name: String(formData.get("name") ?? "") || null,
        whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
        email: String(formData.get("email") ?? "") || null,
        notes: String(formData.get("notes") ?? "") || null,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add customer.");
    }
  }

  return (
    <>
      <PageHeaderBar title="Customers" />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow={`${customers?.length ?? 0} customers`}
          title="Customers"
          description="Every customer conversation and order history, all together."
          action={<Button className="btn-purple h-10 rounded-md border-0 px-4" onClick={() => setOpen(true)}><HugeiconsIcon icon={Add01Icon} size={17} /> Add customer</Button>}
        />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>WhatsApp</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && customers?.length === 0 && <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No customers yet.</TableCell></TableRow>}
                {customers?.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium"><Link href={`/dashboard/customers/${customer.id}`} className="hover:text-primary">{customer.name ?? "Unnamed"}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{customer.whatsapp_number}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add customer</DialogTitle></DialogHeader>
          <form action={submit} className="space-y-4">
            <div className="space-y-1.5"><Label htmlFor="name">Name (optional)</Label><Input id="name" name="name" /></div>
            <div className="space-y-1.5"><Label htmlFor="whatsappNumber">WhatsApp number</Label><Input id="whatsappNumber" name="whatsappNumber" required /></div>
            <div className="space-y-1.5"><Label htmlFor="email">Email (optional)</Label><Input id="email" name="email" type="email" /></div>
            <div className="space-y-1.5"><Label htmlFor="notes">Notes (optional)</Label><Input id="notes" name="notes" /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="submit" disabled={createCustomer.isPending} className="btn-purple border-0">{createCustomer.isPending ? "Saving…" : "Save customer"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
