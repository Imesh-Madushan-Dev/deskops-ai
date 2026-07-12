"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useModelInfo } from "@/lib/query/settings";

export default function ModelsSettingsPage() {
  const { data: info, isLoading } = useModelInfo();

  return (
    <Card className="border-border/80">
      <CardContent className="space-y-4 p-6">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {info && (
          <>
            <div className="flex items-center justify-between border-b border-border/70 pb-4"><span className="text-sm text-muted-foreground">Provider</span><span className="font-medium capitalize">{info.provider}</span></div>
            <div className="flex items-center justify-between border-b border-border/70 pb-4"><span className="text-sm text-muted-foreground">Chat model</span><span className="font-mono text-sm">{info.model}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Embedding model</span><span className="font-mono text-sm">{info.embeddingModel}</span></div>
            <p className="pt-2 text-xs text-muted-foreground">Set via the AI_PROVIDER environment variable — change it and redeploy to switch providers.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
