"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, GoogleSheetIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useUpdateBusiness } from "@/lib/query/settings";

export default function IntegrationsSettingsPage() {
  const { data: overview } = useDashboardOverview();
  const updateBusiness = useUpdateBusiness();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      await updateBusiness.mutateAsync({ whatsappSession: String(formData.get("whatsappSession") ?? "") || null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    }
  }

  const connected = overview?.business.whatsappConnected;

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#25d366]/10">
              <HugeiconsIcon icon={WhatsappIcon} size={20} className="text-[#128c4b]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">WhatsApp (WAHA)</p>
              <p className="text-xs text-muted-foreground">Agents send approved messages through your WAHA session.</p>
            </div>
            <Badge variant={connected ? "default" : "secondary"} className={connected ? "bg-[#34d399]/15 text-[#047857]" : undefined}>
              {connected ? "Connected" : "Not connected"}
            </Badge>
          </div>
          <form action={submit} className="mt-5 space-y-4 border-t border-border/70 pt-5">
            <div className="space-y-1.5">
              <Label htmlFor="whatsappSession">WAHA session name</Label>
              <Input key={overview?.business.whatsappSession ?? ""} id="whatsappSession" name="whatsappSession" placeholder="e.g. default" defaultValue={overview?.business.whatsappSession ?? ""} />
              <p className="text-xs text-muted-foreground">Must match the session name configured in your WAHA instance — case-sensitive.</p>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-[#047857]">Saved.</p>}
            <Button type="submit" disabled={updateBusiness.isPending} className="btn-purple border-0">
              {updateBusiness.isPending && <Spinner />}
              {updateBusiness.isPending ? "Saving…" : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardContent className="p-6">
          <p className="text-sm font-medium">MCP servers</p>
          <p className="mt-1 text-sm text-muted-foreground">External tools connect to your agents as MCP servers.</p>
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-border/70 bg-muted/30 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#0f9d58]/10">
              <HugeiconsIcon icon={GoogleSheetIcon} size={20} className="text-[#0f9d58]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Google Sheets</p>
              <p className="text-xs text-muted-foreground">Sync inventory, invoices, and books to a spreadsheet.</p>
            </div>
            <Badge variant="secondary" className="gap-1 whitespace-nowrap">
              <HugeiconsIcon icon={Clock01Icon} size={12} />
              Coming soon
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
