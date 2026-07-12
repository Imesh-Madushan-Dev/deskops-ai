"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);
  // StrictMode double-invokes effects in dev; two concurrent onboarding calls
  // race past the exists-check and create duplicate businesses.
  const started = useRef(false);

  const completeOnboarding = useCallback(async () => {
    const { data, error: userError } = await createClient().auth.getUser();
    if (userError || !data.user) {
      window.location.replace("/login?error=auth_failed");
      return;
    }

    const businessName = typeof data.user.user_metadata.business_name === "string" && data.user.user_metadata.business_name.trim()
      ? data.user.user_metadata.business_name
      : "My Business";
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to set up your workspace.");
        return;
      }

      window.location.replace("/dashboard");
    } catch {
      setError("Unable to reach the server. Please check your connection.");
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void completeOnboarding();
  }, [completeOnboarding]);

  return (
    <main className="grid min-h-svh place-items-center bg-muted/30 p-6">
      <div className="max-w-sm rounded-xl border border-border bg-background p-6 text-center shadow-sm">
        {!error && <Spinner className="mx-auto mb-3 size-6" />}
        <h1 className="text-lg font-semibold">{error ? "Setup hit a snag" : "Setting up your workspace"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "This will only take a moment."}</p>
        {error && (
          <Button onClick={() => { setError(null); void completeOnboarding(); }} className="mt-4 w-full">
            Try again
          </Button>
        )}
      </div>
    </main>
  );
}
