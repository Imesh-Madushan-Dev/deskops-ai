import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireUser } from "@/lib/db/auth";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return <DashboardShell>{children}</DashboardShell>;
}
