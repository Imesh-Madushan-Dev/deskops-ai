"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  LockPasswordIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  AiMagicIcon,
  MailSend01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/components/ui/toast";

type Mode = "login" | "signup";
type Method = "password" | "magic";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("password");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [password, setPassword] = useState("");
  const timers = useRef<number[]>([]);

  const isLogin = mode === "login";
  const isMagic = method === "magic";
  const supabase = createClient();

  const switchMethod = (next: Method) => {
    setMethod(next);
    setMagicSent(false);
  };

  useEffect(() => {
    return () => timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || magicSent) return;
    setSubmitting(true);

    try {
      if (isMagic) {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
        if (error) {
          toast(error.message, "error");
          setSubmitting(false);
          return;
        }
        setMagicSent(true);
        toast("Magic link sent to your email", "success");
      } else if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast(error.message, "error");
          setSubmitting(false);
          return;
        }
        toast("Signed in successfully", "success");
        const timer = window.setTimeout(() => router.push("/dashboard"), 800);
        timers.current.push(timer);
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { name, business_name: business } } });
        if (error) {
          toast(error.message, "error");
          setSubmitting(false);
          return;
        }
        toast("Check your email to confirm your account", "success");
        const timer = window.setTimeout(() => router.push("/login"), 800);
        timers.current.push(timer);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="font-heading text-3xl leading-tight tracking-wide sm:text-4xl">
        {isLogin ? (
          <>
            Welcome
            <br />
            <span className="text-outline">Back, Boss.</span>
          </>
        ) : (
          <>
            Hire Your
            <br />
            <span className="text-outline">AI Back Office.</span>
          </>
        )}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {isLogin
          ? "Your agents kept the desk warm. Sign in to see what's waiting for approval."
          : "Create your workspace — your agents start learning the business in minutes."}
      </p>

      {magicSent ? (
        <div className="mt-10 rounded-2xl border border-primary/25 bg-accent/50 p-8 text-center">
          <span className="btn-purple mx-auto flex size-12 items-center justify-center rounded-full">
            <HugeiconsIcon icon={MailSend01Icon} size={22} strokeWidth={1.8} />
          </span>
          <h2 className="font-heading mt-5 text-xl tracking-wide">Check Your Inbox.</h2>
          <p className="mt-2.5 text-sm leading-6 text-muted-foreground">
            We sent a magic link to{" "}
            <span className="font-medium text-foreground">{email || "your email"}</span>.
            Click it and you're in — no password needed.
          </p>
          <button type="button" onClick={() => setMagicSent(false)} className="mt-5 cursor-pointer text-sm text-primary underline-offset-4 hover:underline">
            Didn't get it? Send again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {!isLogin && !isMagic && (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" placeholder="Nimal Perera" value={name} onChange={(e) => setName(e.target.value)} required className="h-11 rounded-lg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business">Business name</Label>
                <Input id="business" name="business" placeholder="Nimal's Hardware" value={business} onChange={(e) => setBusiness(e.target.value)} required className="h-11 rounded-lg" />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                <HugeiconsIcon icon={Mail01Icon} size={17} strokeWidth={1.8} />
              </span>
              <Input id="email" name="email" type="email" placeholder="you@business.lk" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11 rounded-lg pl-10" />
            </div>
            {isMagic && <p className="text-xs text-muted-foreground">We'll email you a one-tap sign-in link. No password to remember.</p>}
          </div>

          {!isMagic && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <a href="#" className="text-xs text-muted-foreground transition-colors hover:text-primary">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
                  <HugeiconsIcon icon={LockPasswordIcon} size={17} strokeWidth={1.8} />
                </span>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={isLogin ? "Your password" : "Minimum 8 characters"}
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-lg pr-11 pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                >
                  <HugeiconsIcon icon={showPassword ? EyeOffIcon : EyeIcon} size={17} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          )}

          <Button type="submit" disabled={submitting} className="btn-purple h-12 w-full border-0 text-base">
            {submitting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {isMagic ? "Sending link…" : isLogin ? "Signing in…" : "Creating account…"}
              </>
            ) : isMagic ? (
              <>
                Send magic link
                <HugeiconsIcon icon={MailSend01Icon} size={18} strokeWidth={2} />
              </>
            ) : (
              <>
                {isLogin ? "Sign in" : "Create workspace"}
                <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} />
              </>
            )}
          </Button>
        </form>
      )}

      {!magicSent && (
        <>
          <div className="relative my-7">
            <Separator />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 font-mono text-[11px] text-muted-foreground">or</span>
          </div>

          <Button variant="outline" type="button" onClick={() => switchMethod(isMagic ? "password" : "magic")} className="h-11 w-full rounded-lg">
            <HugeiconsIcon icon={isMagic ? LockPasswordIcon : AiMagicIcon} size={17} strokeWidth={1.8} />
            {isMagic ? "Use a password instead" : "Continue with a magic link"}
          </Button>
        </>
      )}

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {isLogin ? "New to Deskops?" : "Already have a workspace?"}{" "}
        <a href={isLogin ? "/signup" : "/login"} className="font-medium text-primary underline-offset-4 hover:underline">
          {isLogin ? "Create a workspace" : "Sign in"}
        </a>
      </p>
    </div>
  );
}
