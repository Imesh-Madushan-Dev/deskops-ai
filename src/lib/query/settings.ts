"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { BusinessInput } from "@/lib/db/business";
import type { WhatsappSessionState } from "@/app/api/whatsapp/session/route";

export type TeamMember = { user_id: string; role: "owner" | "admin" | "staff"; created_at: string };
export type ModelInfo = {
  current: { providerId: string; modelName: string };
  embeddingModel: string;
  providers: { id: string; label: string; models: { id: string; label: string; tier: "fast" | "standard" | "thinking" }[]; hasKey: boolean }[];
  usage: {
    sinceDays: number;
    requests: number;
    inputTokens: number;
    outputTokens: number;
    byModel: { provider: string; model: string; requests: number; inputTokens: number; outputTokens: number }[];
  };
};

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessInput) => fetch("/api/business", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json(r)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.overview });
      void qc.invalidateQueries({ queryKey: [...qk.settings, "models"] });
    },
  });
}

export function useTeamMembers() {
  return useQuery({ queryKey: qk.settings, queryFn: () => fetch("/api/business/team").then((r) => json<TeamMember[]>(r)) });
}

export function useModelInfo() {
  return useQuery({ queryKey: [...qk.settings, "models"], queryFn: () => fetch("/api/settings/models").then((r) => json<ModelInfo>(r)) });
}

const whatsappKey = [...qk.settings, "whatsapp"];

/** Live WAHA session status. Polls only while the session is mid-connect — once it is WORKING (or
 *  stopped/failed and waiting on the owner) nothing changes on its own.
 *  ponytail: polling, not realtime. The session emits a `session.status` webhook; wire that into the
 *  realtime channel only if 2s polling proves too slow or costly. */
export function useWhatsappSession() {
  return useQuery({
    queryKey: whatsappKey,
    queryFn: () => fetch("/api/whatsapp/session").then((r) => json<WhatsappSessionState>(r)),
    refetchInterval: (query) => (query.state.data?.status === "STARTING" || query.state.data?.status === "SCAN_QR_CODE" ? 2000 : false),
  });
}

export function useWhatsappAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (action: "connect" | "restart" | "logout" | "disconnect") =>
      fetch("/api/whatsapp/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }).then((r) => json<WhatsappSessionState>(r)),
    onSuccess: (state) => {
      qc.setQueryData(whatsappKey, state);
      void qc.invalidateQueries({ queryKey: qk.overview });
    },
  });
}
