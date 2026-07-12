"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useModelInfo, useUpdateBusiness } from "@/lib/query/settings";

const formatCount = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export default function ModelsSettingsPage() {
  const { data: info, isLoading } = useModelInfo();
  const updateBusiness = useUpdateBusiness();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (isLoading || !info) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{isLoading ? "Loading…" : "Unable to load model settings."}</p>;
  }

  const providerId = selectedProvider ?? info.current.providerId;
  const provider = info.providers.find((p) => p.id === providerId) ?? info.providers[0];
  const model = selectedModel && provider.models.includes(selectedModel) ? selectedModel : (providerId === info.current.providerId ? info.current.modelName : provider.models[0]);
  const dirty = providerId !== info.current.providerId || model !== info.current.modelName;

  async function save() {
    setError(null);
    setSaved(false);
    try {
      await updateBusiness.mutateAsync({ aiProvider: providerId, aiModel: model });
      setSaved(true);
      setSelectedProvider(null);
      setSelectedModel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save.");
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/80">
        <CardContent className="p-6">
          <p className="text-sm font-medium">Chat model</p>
          <p className="mt-1 text-sm text-muted-foreground">Pick which provider and model powers your agents. API keys are configured in the server environment.</p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {info.providers.map((p) => {
              const active = p.id === providerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!p.hasKey}
                  onClick={() => { setSelectedProvider(p.id); setSelectedModel(null); }}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    active ? "border-primary bg-primary/5 font-medium text-primary" : "border-border/70 hover:border-primary/40",
                    !p.hasKey && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span>{p.label}</span>
                  {p.hasKey
                    ? active && <Badge variant="secondary" className="bg-primary/10 text-primary">Active</Badge>
                    : <Badge variant="secondary">No API key</Badge>}
                </button>
              );
            })}
          </div>

          <div className="mt-4 max-w-sm space-y-1.5">
            <label htmlFor="model" className="text-sm font-medium">Model</label>
            <NativeSelect id="model" value={model} onChange={(event) => setSelectedModel(event.target.value)} className="w-full">
              {provider.models.map((m) => <option key={m} value={m}>{m}</option>)}
            </NativeSelect>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
          {saved && !dirty && <p className="mt-4 text-sm text-[#047857]">Saved. Agent runs now use {info.current.modelName}.</p>}
          <Button onClick={save} disabled={!dirty || updateBusiness.isPending} className="btn-purple mt-5 border-0">
            {updateBusiness.isPending && <Spinner />}
            {updateBusiness.isPending ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Usage</p>
            <p className="text-xs text-muted-foreground">Last {info.usage.sinceDays} days</p>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">Requests</p><p className="mt-1 text-xl font-semibold">{formatCount.format(info.usage.requests)}</p></div>
            <div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">Input tokens</p><p className="mt-1 text-xl font-semibold">{formatCount.format(info.usage.inputTokens)}</p></div>
            <div className="rounded-lg border border-border/70 p-3"><p className="text-xs text-muted-foreground">Output tokens</p><p className="mt-1 text-xl font-semibold">{formatCount.format(info.usage.outputTokens)}</p></div>
          </div>
          {info.usage.byModel.length > 0 && (
            <Table className="mt-4">
              <TableHeader><TableRow><TableHead>Model</TableHead><TableHead className="text-right">Requests</TableHead><TableHead className="text-right">In</TableHead><TableHead className="text-right">Out</TableHead></TableRow></TableHeader>
              <TableBody>
                {info.usage.byModel.map((row) => (
                  <TableRow key={`${row.provider}/${row.model}`}>
                    <TableCell><span className="font-mono text-xs">{row.model}</span> <span className="text-xs text-muted-foreground">({row.provider})</span></TableCell>
                    <TableCell className="text-right">{formatCount.format(row.requests)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCount.format(row.inputTokens)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCount.format(row.outputTokens)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {info.usage.byModel.length === 0 && <p className="mt-4 text-sm text-muted-foreground">No agent runs yet — usage appears here after your first conversation.</p>}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Embedding model</p>
              <p className="mt-1 text-sm text-muted-foreground">Fixed — the vector index dimension is tied to this model.</p>
            </div>
            <span className="font-mono text-sm">{info.embeddingModel}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
