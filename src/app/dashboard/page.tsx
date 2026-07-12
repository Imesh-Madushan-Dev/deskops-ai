import type { Metadata } from "next";
import { DashboardPreview } from "@/components/dashboard/DashboardPreview";

export const metadata: Metadata = {
  title: "Dashboard — Deskops AI",
  description: "Hardcoded Deskops AI dashboard preview.",
};

export default function DashboardPage() {
  return <DashboardPreview />;
}
