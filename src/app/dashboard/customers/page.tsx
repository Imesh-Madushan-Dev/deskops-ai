"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { contactLabel } from "@/lib/utils/contact";
import { useCreateCustomer, useCustomers } from "@/lib/query/customers";
import { EmptyState, InitialsAvatar, PageIntro, PageShell, Panel, relativeTime, SearchField } from "@/components/dashboard/ui";

export default function CustomersPage() {
  const { data: customers, isLoading } = useCustomers();
  const createCustomer = useCreateCustomer();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = (customers ?? []).filter((c) => `${c.name ?? ""} ${c.whatsapp_number} ${c.email ?? ""}`.toLowerCase().includes(search.toLowerCase()));

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
    <PageShell
      crumbs={["Customers"]}
      actions={<Button className="btn-purple h-9 rounded-lg border-0 px-4 text-sm" onClick={() => setOpen(true)}><HugeiconsIcon icon={Add01Icon} size={16} /> Add customer</Button>}
    >
      <PageIntro eyebrow={`${customers?.length ?? 0} customers`} title="Customers" description="Every conversation, quote, and order history in one profile — the context your agents ground on." />

      <Panel title="Directory" action={<SearchField value={search} onChange={setSearch} placeholder="Search name, number, email…" className="w-56 sm:w-72" />}>
        <div className="divide-y divide-border/60">
          {isLoading && <p className="p-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && filtered.length === 0 && (
            <EmptyState
              icon={UserGroupIcon}
              title={search ? "No matches" : "No customers yet"}
              hint={search ? "Try a different search." : "Customers are created automatically when someone messages you on WhatsApp."}
              action={!search ? <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Add customer</Button> : undefined}
            />
          )}
          {filtered.map((customer) => (
            <Link key={customer.id} href={`/dashboard/customers/${customer.id}`} className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40">
              <InitialsAvatar name={contactLabel(customer)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customer.name ?? contactLabel(customer)}</p>
                <p className="truncate text-xs text-muted-foreground">{contactLabel({ whatsapp_number: customer.whatsapp_number })}{customer.email ? ` · ${customer.email}` : ""}</p>
              </div>
              <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">added {relativeTime(customer.created_at)}</span>
            </Link>
          ))}
        </div>
      </Panel>

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
    </PageShell>
  );
}
