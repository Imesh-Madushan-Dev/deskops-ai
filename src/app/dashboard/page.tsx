import type { Metadata } from "next";
import { OverviewView } from "@/components/dashboard/OverviewView";

export const metadata: Metadata = {
  title: "Dashboard — Deskops AI",
  description: "Live overview of approvals, sales, and inventory.",
};

export default function DashboardPage() {
  return <OverviewView />;
}
