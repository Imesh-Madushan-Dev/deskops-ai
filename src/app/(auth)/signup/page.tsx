import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Create your workspace — Deskops AI",
  description: "Set up your Deskops AI workspace and put an AI back office to work on your customers, invoices, inventory and books.",
};

export default function SignupPage() {
  return (
    <AuthShell>
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
