"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useCreateLedgerEntry, useLedgerEntries } from "@/lib/query/books";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { formatMoney } from "@/lib/utils/money";

export default function BooksPage() {
  const { data: entries, isLoading } = useLedgerEntries();
  const { data: overview } = useDashboardOverview();
  const createEntry = useCreateLedgerEntry();
  const [open, setOpen] = useState(false);
  const [entryType, setEntryType] = useState<"income" | "expense">("expense");
  const [error, setError] = useState<string | null>(null);
  const currency = overview?.business.currency ?? "LKR";

  async function submit(formData: FormData) {
    setError(null);
    try {
      await createEntry.mutateAsync({ entryType, amount: Number(formData.get("amount") ?? 0), category: String(formData.get("category") ?? "") });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add entry.");
    }
  }

  return (
    <>
      <PageHeaderBar title="Books" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle
          eyebrow="Ledger"
          title="Books"
          description="Reliable income and expense records, updated automatically after a sale."
          action={
            <div className="flex gap-3">
              <Link href="/dashboard/books/reports"><Button variant="outline" className="h-10 rounded-md px-4">Reports</Button></Link>
              <Button className="btn-purple h-10 rounded-md border-0 px-4" onClick={() => setOpen(true)}><HugeiconsIcon icon={Add01Icon} size={17} /> Add entry</Button>
            </div>
          }
        />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">Loading…</TableCell></TableRow>}
                {!isLoading && entries?.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No ledger entries yet.</TableCell></TableRow>}
                {entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-muted-foreground">{new Date(entry.occurred_at).toLocaleDateString()}</TableCell>
                    <TableCell>{entry.category}</TableCell>
                    <TableCell><Badge variant={entry.entry_type === "income" ? "default" : "outline"} className="capitalize">{entry.entry_type}</Badge></TableCell>
                    <TableCell className={entry.entry_type === "income" ? "text-[#047857]" : "text-destructive"}>{entry.entry_type === "income" ? "+" : "-"}{formatMoney(entry.amount, currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add ledger entry</DialogTitle></DialogHeader>
          <form action={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={entryType} onValueChange={(v) => setEntryType(v as "income" | "expense")}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="amount">Amount</Label><Input id="amount" name="amount" type="number" min="0" step="0.01" required /></div>
            <div className="space-y-1.5"><Label htmlFor="category">Category</Label><Input id="category" name="category" required /></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <DialogFooter><Button type="submit" disabled={createEntry.isPending} className="btn-purple border-0">{createEntry.isPending ? "Saving…" : "Add entry"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
