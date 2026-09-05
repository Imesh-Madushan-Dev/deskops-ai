"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { Clock01Icon, GoogleSheetIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WhatsappConnectCard } from "@/components/settings/WhatsappConnectCard";

export default function IntegrationsSettingsPage() {
  return (
    <div className="space-y-6">
      <WhatsappConnectCard />

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
