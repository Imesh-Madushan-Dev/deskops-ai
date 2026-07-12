"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
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

  return (
    <>
      <PageHeaderBar title="Integrations" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="Connections" title="Integrations" description="Connect your WAHA WhatsApp session so agents can send approved messages." />

        <Card className="mt-8 border-border/80">
          <CardContent className="p-6">
            <form action={submit} className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className={overview?.business.whatsappConnected ? "size-2 rounded-full bg-[#34d399]" : "size-2 rounded-full bg-muted-foreground/40"} />
                {overview?.business.whatsappConnected ? "WAHA session configured" : "No WAHA session configured yet"}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsappSession">WAHA session name</Label>
                <Input id="whatsappSession" name="whatsappSession" placeholder="e.g. default" defaultValue={overview?.business.whatsappConnected ? undefined : ""} />
                <p className="text-xs text-muted-foreground">Must match the session name configured in your WAHA instance (WAHA_BASE_URL / WAHA_API_KEY env vars).</p>
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {saved && <p className="text-sm text-[#047857]">Saved.</p>}
              <Button type="submit" disabled={updateBusiness.isPending} className="btn-purple border-0">{updateBusiness.isPending ? "Saving…" : "Save"}</Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6 border-border/80">
          <CardContent className="p-6">
            <p className="text-sm font-medium">MCP servers</p>
            <p className="mt-1 text-sm text-muted-foreground">External tools (Google Sheets, accounting) connect as MCP servers configured at the infrastructure level — none are wired up for this workspace yet.</p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
