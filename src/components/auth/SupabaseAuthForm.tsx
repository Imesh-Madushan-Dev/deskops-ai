"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function SupabaseAuthForm({ mode }: { mode: "login" | "signup" }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signup = mode === "signup";

  async function submit(formData: FormData) {
    setLoading(true); setError(null); setNotice(null);
    const supabase = createClient();
    const password = String(formData.get("password") ?? "");
    const redirectTo = `${window.location.origin}/auth/callback`;
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo, data: { full_name: String(formData.get("name") ?? ""), business_name: String(formData.get("business") ?? "") } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    if (signup && !result.data.session) { setNotice("Check your inbox to confirm your account, then we will finish setting up your workspace."); return; }
    if (signup) {
      const onboarding = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName: String(formData.get("business") ?? "") }),
      });
      if (!onboarding.ok) {
        const body = await onboarding.json().catch(() => null) as { error?: string } | null;
        setError(body?.error ?? "Unable to create your workspace.");
        return;
      }
    }
    window.location.assign("/dashboard");
  }

  async function sendMagicLink() {
    setLoading(true); setError(null); setNotice(null);
    const { error: authError } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    setLoading(false);
    if (authError) { setError(authError.message); return; }
    setNotice("Magic link sent. Check your inbox to sign in.");
  }

  return <div>
    <h1 className="font-heading text-3xl leading-tight tracking-wide sm:text-4xl">{signup ? <>Hire Your<br /><span className="text-outline">AI Back Office.</span></> : <>Welcome<br /><span className="text-outline">Back, Boss.</span></>}</h1>
    <p className="mt-4 text-sm text-muted-foreground">{signup ? "Create your workspace and start with a real, approval-gated back office." : "Sign in to see what your agents have waiting for approval."}</p>
    <form action={submit} className="mt-8 space-y-5">
      {signup && <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="name">Your name</Label><Input id="name" name="name" required className="h-11 rounded-lg" /></div><div className="space-y-2"><Label htmlFor="business">Business name</Label><Input id="business" name="business" required className="h-11 rounded-lg" /></div></div>}
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-11 rounded-lg" /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} required className="h-11 rounded-lg" /></div>
      {error && <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {notice && <p className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">{notice}</p>}
      <Button type="submit" disabled={loading} className="btn-purple h-12 w-full rounded-md border-0">{loading ? "Please wait…" : signup ? "Create workspace" : "Sign in"}</Button>
      <Button type="button" variant="outline" disabled={loading || !email} onClick={sendMagicLink} className="h-11 w-full rounded-lg">Send magic link</Button>
    </form>
    <p className="mt-8 text-center text-sm text-muted-foreground">{signup ? "Already have a workspace?" : "New to Deskops?"} <Link href={signup ? "/login" : "/signup"} className="font-medium text-primary hover:underline">{signup ? "Sign in" : "Create one"}</Link></p>
  </div>;
}
