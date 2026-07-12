"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeaderBar, PageTitle } from "@/components/dashboard/PageHeader";
import { useModelInfo } from "@/lib/query/settings";

export default function ModelsSettingsPage() {
  const { data: info, isLoading } = useModelInfo();

  return (
    <>
      <PageHeaderBar title="AI models" />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-8 sm:py-10">
        <PageTitle eyebrow="Provider" title="AI models" description="Set via the AI_PROVIDER environment variable — change it and redeploy to switch providers." />
        <Card className="mt-8 border-border/80">
          <CardContent className="space-y-4 p-6">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {info && (
              <>
                <div className="flex items-center justify-between border-b border-border/70 pb-4"><span className="text-sm text-muted-foreground">Provider</span><span className="font-medium capitalize">{info.provider}</span></div>
                <div className="flex items-center justify-between border-b border-border/70 pb-4"><span className="text-sm text-muted-foreground">Chat model</span><span className="font-mono text-sm">{info.model}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Embedding model</span><span className="font-mono text-sm">{info.embeddingModel}</span></div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
