import { useQuery } from "@tanstack/react-query";
import { qk } from "./keys";

type Overview = {
  business: { id: string; name: string; currency: string; timezone: string; whatsappSession: string | null; whatsappConnected: boolean; autoApproveReplies: boolean; autoApproveInvoices: boolean };
  conversations: number;
  approvals: number;
  lowStock: number;
  salesToday: number;
};

export function useDashboardOverview() {
  return useQuery({
    queryKey: qk.overview,
    queryFn: async () => {
      const response = await fetch("/api/dashboard/overview");
      if (!response.ok) throw new Error("Unable to load dashboard");
      return response.json() as Promise<Overview>;
    },
    // Live updates come from useRealtimeSync; this is only a slow safety net for the badges.
    refetchInterval: 120_000,
  });
}
