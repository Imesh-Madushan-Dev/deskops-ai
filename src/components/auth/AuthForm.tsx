"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Mail01Icon,
  LockPasswordIcon,
  EyeIcon,
  EyeOffIcon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
  GithubIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting || done) return;
    setSubmitting(true);
    // Auth backend isn't wired yet — simulate the round trip, then land home.
    window.setTimeout(() => {
      setSubmitting(false);
      setDone(true);
      window.setTimeout(() => router.push("/"), 900);
    }, 1200);
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

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {!isLogin && (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" placeholder="Nimal Perera" required className="h-11 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="business">Business name</Label>
              <Input id="business" name="business" placeholder="Nimal's Hardware" required className="h-11 rounded-lg" />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
              <HugeiconsIcon icon={Mail01Icon} size={17} strokeWidth={1.8} />
            </span>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@business.lk"
              required
              className="h-11 rounded-lg pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            {isLogin && (
              <Link
                href="#"
                className="text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                Forgot password?
              </Link>
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

        <Button
          type="submit"
          disabled={submitting || done}
          className={cn(
            "h-12 w-full border-0 text-base",
            done ? "bg-[#059669] text-white hover:bg-[#059669]" : "btn-purple"
          )}
        >
          {done ? (
            <>
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} strokeWidth={2} />
              {isLogin ? "Signed in — heading to your desk" : "Workspace created!"}
            </>
          ) : submitting ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              {isLogin ? "Signing in…" : "Setting up your agents…"}
            </>
          ) : (
            <>
              {isLogin ? "Sign in" : "Create workspace"}
              <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} />
            </>
          )}
        </Button>
      </form>

      <div className="relative my-7">
        <Separator />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 font-mono text-[11px] text-muted-foreground">
          or
        </span>
      </div>

      <Button variant="outline" className="h-11 w-full rounded-lg" type="button">
        <HugeiconsIcon icon={GithubIcon} size={17} strokeWidth={1.8} />
        Continue with GitHub
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {isLogin ? "New to Deskops?" : "Already have a workspace?"}{" "}
        <Link
          href={isLogin ? "/signup" : "/login"}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {isLogin ? "Create a workspace" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
