"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeOnboarding() {
      const { data, error: userError } = await createClient().auth.getUser();
      if (userError || !data.user) {
        window.location.replace("/login?error=auth_failed");
        return;
      }

      const businessName = typeof data.user.user_metadata.business_name === "string"
        ? data.user.user_metadata.business_name
        : "My Business";
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: businessName || "My Business" }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to set up your workspace.");
        return;
      }

      window.location.replace("/dashboard");
    }

    void completeOnboarding();
  }, []);

  return (
    <main className="grid min-h-svh place-items-center bg-muted/30 p-6">
      <div className="max-w-sm rounded-xl border border-border bg-background p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Setting up your workspace</h1>
        <p className="mt-2 text-sm text-muted-foreground">This will only take a moment.</p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}
