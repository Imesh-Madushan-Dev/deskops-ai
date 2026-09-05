"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useAdjustStock } from "@/lib/query/inventory";

export type AdjustTarget = { id: string; name: string; stock_qty: number };

/** The three things an owner actually does to stock. "Set exact count" is the stocktake case —
 *  it is the reason +1/-1 buttons never worked: after counting a shelf you know the total, not
 *  the delta. Each maps to the two reasons the ledger accepts. */
const MODES = {
  receive: { label: "Receive", verb: "Received", hint: "A delivery arrived", reason: "restock" as const },
  remove: { label: "Remove", verb: "Removed", hint: "Damaged, lost, or sold offline", reason: "adjustment" as const },
  set: { label: "Set count", verb: "Set", hint: "After a stocktake", reason: "adjustment" as const },
};
type Mode = keyof typeof MODES;

/** Keyed by product id so opening a different product remounts with empty fields — a reset
 *  effect would fire a second render pass to do the same thing. */
export function StockAdjustDialog({ target, onOpenChange }: { target: AdjustTarget | null; onOpenChange: (open: boolean) => void }) {
  if (!target) return null;
  return <AdjustForm key={target.id} target={target} onOpenChange={onOpenChange} />;
}

function AdjustForm({ target, onOpenChange }: { target: AdjustTarget; onOpenChange: (open: boolean) => void }) {
  const adjust = useAdjustStock();
  const [mode, setMode] = useState<Mode>("receive");
  const [qty, setQty] = useState("");

  const amount = Number(qty);
  const valid = qty.trim() !== "" && Number.isInteger(amount) && amount >= 0 && !(mode !== "set" && amount === 0);
  const delta = mode === "receive" ? amount : mode === "remove" ? -amount : amount - target.stock_qty;
  const next = target.stock_qty + delta;
  // The ledger refuses negative stock; say so before the request rather than after it fails.
  const tooLow = valid && next < 0;

  async function submit() {
    if (!valid || tooLow || delta === 0) return;
    try {
      await adjust.mutateAsync({ productId: target.id, delta, reason: MODES[mode].reason });
      toast.success(`${MODES[mode].verb} — ${target.name} is now ${next}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update stock.");
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update stock</DialogTitle>
          <DialogDescription>
            {target.name} — {target.stock_qty} on hand
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-muted/40 p-1">
          {(Object.keys(MODES) as Mode[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              aria-pressed={mode === key}
              className={cn(
                "rounded-md px-2 py-1.5 text-sm transition-colors",
                mode === key ? "bg-background font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {MODES[key].label}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="qty">{mode === "set" ? "Counted quantity" : "Quantity"}</Label>
          <Input id="qty" type="number" min="0" step="1" inputMode="numeric" autoFocus value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
          <p className="text-xs text-muted-foreground">{MODES[mode].hint}</p>
        </div>

        {/* The whole point of the dialog: show the resulting number before committing to it. */}
        <p className={cn("rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm", tooLow && "border-destructive/40 text-destructive")}>
          {!valid ? (
            <span className="text-muted-foreground">Enter a quantity to see the new total.</span>
          ) : tooLow ? (
            `That would leave ${next} — stock can't go below zero.`
          ) : (
            <>
              New total: <span className="font-mono font-semibold tabular-nums">{next}</span>
              <span className="text-muted-foreground"> ({delta > 0 ? `+${delta}` : delta} from {target.stock_qty})</span>
            </>
          )}
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || tooLow || delta === 0 || adjust.isPending} className="btn-purple border-0">
            {adjust.isPending && <Spinner />}
            Update stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
