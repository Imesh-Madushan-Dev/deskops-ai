"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useDashboardOverview } from "@/lib/query/dashboard";
import { useUpdateBusiness } from "@/lib/query/settings";

export default function SettingsPage() {
  const { data: overview } = useDashboardOverview();
  const updateBusiness = useUpdateBusiness();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    try {
      await updateBusiness.mutateAsync({
        name: String(formData.get("name") ?? ""),
        currency: String(formData.get("currency") ?? "").toUpperCase(),
        timezone: String(formData.get("timezone") ?? ""),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save changes.");
    }
  }

  return (
    <>
      <PageHeaderBar title="Settings" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow={overview?.business.name ?? ""} title="Workspace settings" description="Manage your business profile, team, connections, and AI model preferences." />

        <nav className="mt-6 flex gap-2 text-sm">
          <Link href="/dashboard/settings" className="rounded-md bg-primary/10 px-3 py-1.5 font-medium text-primary">Profile</Link>
          <Link href="/dashboard/settings/team" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted">Team</Link>
          <Link href="/dashboard/settings/integrations" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted">Integrations</Link>
          <Link href="/dashboard/settings/models" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted">AI models</Link>
        </nav>

        <Card className="mt-6 border-border/80">
          <CardContent className="p-6">
            {overview && (
              <form action={submit} className="space-y-4">
                <div className="space-y-1.5"><Label htmlFor="name">Business name</Label><Input id="name" name="name" defaultValue={overview.business.name} required /></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="currency">Currency (ISO code)</Label><Input id="currency" name="currency" defaultValue={overview.business.currency} maxLength={3} required /></div>
                  <div className="space-y-1.5"><Label htmlFor="timezone">Timezone</Label><Input id="timezone" name="timezone" defaultValue={overview.business.timezone} required /></div>
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                {saved && <p className="text-sm text-[#047857]">Saved.</p>}
                <Button type="submit" disabled={updateBusiness.isPending} className="btn-purple border-0">{updateBusiness.isPending ? "Saving…" : "Save changes"}</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
