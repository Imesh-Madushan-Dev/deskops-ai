import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { SupabaseAuthForm } from "@/components/auth/SupabaseAuthForm";

export const metadata: Metadata = {
  title: "Sign in — Deskops AI",
  description: "Sign in to your Deskops AI workspace and review what your agents have waiting for approval.",
};

export default function LoginPage() {
  return (
    <AuthShell>
      <SupabaseAuthForm mode="login" />
    </AuthShell>
  );
}
