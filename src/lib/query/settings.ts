"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "./keys";
import type { BusinessInput } from "@/lib/db/business";

export type TeamMember = { user_id: string; role: "owner" | "admin" | "staff"; created_at: string };
export type ModelInfo = { provider: string; model: string; embeddingModel: string };

async function json<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
}

export function useUpdateBusiness() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessInput) => fetch("/api/business", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }).then((r) => json(r)),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.overview }),
  });
}

export function useTeamMembers() {
  return useQuery({ queryKey: qk.settings, queryFn: () => fetch("/api/business/team").then((r) => json<TeamMember[]>(r)) });
}

export function useModelInfo() {
  return useQuery({ queryKey: [...qk.settings, "models"], queryFn: () => fetch("/api/settings/models").then((r) => json<ModelInfo>(r)) });
}
