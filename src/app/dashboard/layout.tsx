import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireUser } from "@/lib/db/auth";

export default async function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { supabase } = await requireUser();
  const { data: business } = await supabase.from("businesses").select("id").limit(1).maybeSingle();
  if (!business) redirect("/onboarding");
  return <DashboardShell>{children}</DashboardShell>;
}
