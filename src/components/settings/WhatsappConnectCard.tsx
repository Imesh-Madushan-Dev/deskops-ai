"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { WhatsappIcon } from "@hugeicons/core-free-icons";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { StatusPill } from "@/components/dashboard/ui";
import { useWhatsappAction, useWhatsappSession } from "@/lib/query/settings";

const statusMeta = {
  NOT_CONFIGURED: { tone: "neutral", label: "Unavailable" },
  STOPPED: { tone: "neutral", label: "Not connected" },
  STARTING: { tone: "warn", label: "Starting" },
  SCAN_QR_CODE: { tone: "warn", label: "Waiting for scan" },
  PASSKEY_REQUIRED: { tone: "warn", label: "Confirm on phone" },
  PASSKEY_CONFIRMATION_REQUIRED: { tone: "warn", label: "Confirm on phone" },
  WORKING: { tone: "ok", label: "Connected" },
  FAILED: { tone: "bad", label: "Disconnected" },
} as const;

export function WhatsappConnectCard() {
  const { data, dataUpdatedAt, isLoading, error } = useWhatsappSession();
  const action = useWhatsappAction();
  const [dismissedQr, setDismissedQr] = useState(false);

  const status = data?.status ?? "STOPPED";
  const busy = action.isPending;
  const scanning = status === "SCAN_QR_CODE";

  const meta = statusMeta[status];
  const failure = action.error ?? error;

  return (
    <Card className="border-border/80">
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#25d366]/10">
            <HugeiconsIcon icon={WhatsappIcon} size={20} className="text-[#128c4b]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">WhatsApp</p>
            <p className="text-xs text-muted-foreground">
              {status === "WORKING" && data?.phone ? `+${data.phone}${data.pushName ? ` · ${data.pushName}` : ""}` : "Link your business number so agents can reply to customers."}
            </p>
          </div>
          {isLoading ? <Spinner /> : <StatusPill tone={meta.tone}>{meta.label}</StatusPill>}
        </div>

        <div className="mt-5 border-t border-border/70 pt-5">
          {status === "NOT_CONFIGURED" && (
            <p className="text-sm text-muted-foreground">WhatsApp isn&apos;t set up on this server yet. Ask your administrator to add the WAHA credentials.</p>
          )}

          {(status === "STOPPED" || status === "FAILED") && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => { setDismissedQr(false); action.mutate("connect"); }} disabled={busy} className="btn-purple border-0">
                {busy && <Spinner />}
                {status === "FAILED" ? "Reconnect" : "Connect WhatsApp"}
              </Button>
              <p className="text-xs text-muted-foreground">You&apos;ll scan a QR code with WhatsApp on your phone.</p>
            </div>
          )}

          {(status === "STARTING" || status === "PASSKEY_REQUIRED" || status === "PASSKEY_CONFIRMATION_REQUIRED") && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner />
              {status === "STARTING" ? "Preparing your session…" : "Open WhatsApp on your phone and confirm the pairing request."}
            </p>
          )}

          {scanning && (
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => setDismissedQr(false)} className="btn-purple border-0">Show QR code</Button>
              <p className="text-xs text-muted-foreground">Waiting for you to scan the code with WhatsApp.</p>
            </div>
          )}

          {status === "WORKING" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => action.mutate("restart")} disabled={busy}>
                {busy && <Spinner />}
                Restart
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={busy} className="text-destructive hover:text-destructive">Disconnect</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect WhatsApp?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your number will be unlinked and agents will stop sending or receiving WhatsApp messages until you connect again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => action.mutate("disconnect")}>Disconnect</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {failure && <p role="alert" className="mt-3 text-sm text-destructive">{failure instanceof Error ? failure.message : "Something went wrong."}</p>}
        </div>
      </CardContent>

      <Dialog open={scanning && !dismissedQr} onOpenChange={(open) => !open && setDismissedQr(true)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to connect</DialogTitle>
            <DialogDescription>On your phone: WhatsApp → Settings → Linked devices → Link a device.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center rounded-lg border border-border/70 bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- proxied, no-store PNG that rotates every few seconds; next/image would only add a cache we don't want */}
            <img src={`/api/whatsapp/qr?t=${dataUpdatedAt}`} alt="WhatsApp pairing QR code" width={260} height={260} className="size-[260px]" />
          </div>
          <p className="text-center text-xs text-muted-foreground">This page updates itself once your phone is linked.</p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
