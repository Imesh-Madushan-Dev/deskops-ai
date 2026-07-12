"use client";

import { useQuery } from "@tanstack/react-query";
import { qk } from "./keys";

export type DailyInsight = { for_date: string; summary: string; metrics: Record<string, unknown> } | null;

export function useInsight(date: string) {
  return useQuery({
    queryKey: qk.insights(date),
    queryFn: async () => {
      const response = await fetch(`/api/insights?date=${date}`);
      if (!response.ok) throw new Error("Unable to load insight");
      return (await response.json()) as DailyInsight;
    },
  });
}
