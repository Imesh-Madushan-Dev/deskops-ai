"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  WhatsappIcon,
  AiBrain01Icon,
  CheckmarkCircle02Icon,
  PackageIcon,
  InvoiceIcon,
  ArrowRight02Icon,
  ChartLineData01Icon,
  ShieldIcon,
  SentIcon,
  Refresh01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Stage = "idle" | "typing" | "approved";

function ChatBubble({
  side,
  time,
  ticks,
  highlight,
  children,
  ...rest
}: {
  side: "in" | "out";
  time: string;
  ticks?: boolean;
  highlight?: boolean;
  children: React.ReactNode;
} & Record<string, unknown>) {
  return (
    <div
      {...rest}
      className={cn("flex w-full", side === "out" ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "relative max-w-[82%] rounded-2xl px-4 pt-2.5 pb-5 text-[14px] leading-6 shadow-sm",
          side === "out"
            ? "rounded-br-md bg-accent text-accent-foreground"
            : "rounded-bl-md border border-border/60 bg-card",
          highlight && "bg-[#25D366]/15 text-foreground"
        )}
      >
        {children}
        <span
          className={cn(
            "absolute right-3 bottom-1.5 flex items-center gap-1 font-mono text-[9.5px]",
            side === "out" ? "text-accent-foreground/60" : "text-muted-foreground/70"
          )}
        >
          {time}
          {ticks && <span className="text-[10px] tracking-[-0.18em] text-primary">✓✓</span>}
        </span>
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex justify-end">
      <div className="rounded-2xl rounded-br-md bg-accent px-4 py-3.5">
        <span className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-1.5 animate-bounce rounded-full bg-accent-foreground/50"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

export function HeroSection() {
  const scope = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const [stage, setStage] = useState<Stage>("idle");

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out", duration: 0.9 } })
        .from("[data-hero='badge']", { y: 24, opacity: 0 })
        .from("[data-hero='line']", { y: 80, opacity: 0, stagger: 0.12, duration: 1 }, "-=0.5")
        .from("[data-hero='sub']", { y: 28, opacity: 0 }, "-=0.6")
        .from("[data-hero='cta']", { y: 20, opacity: 0 }, "-=0.65")
        .from("[data-hero='preview']", { y: 80, opacity: 0, duration: 1.2 }, "-=0.5")
        .from(
          "[data-hero='bubble']",
          { y: 16, opacity: 0, stagger: 0.12, duration: 0.5 },
          "-=0.6"
        );

      gsap.to("[data-hero='orbit']", {
        y: -12,
        repeat: -1,
        yoyo: true,
        duration: 2.6,
        ease: "sine.inOut",
      });

      // nudge the "try it" hint up and down so the eye lands on the button
      gsap.to("[data-hero='hint']", {
        y: -6,
        repeat: -1,
        yoyo: true,
        duration: 0.7,
        ease: "sine.inOut",
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  // subtle 3D tilt following the cursor over the window
  useEffect(() => {
    const el = windowRef.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const qx = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    const qy = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 1400 });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      qx(x * 4);
      qy(y * -4);
    };
    const onLeave = () => {
      qx(0);
      qy(0);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  // pop in newly arrived chat content + keep the thread scrolled to the bottom
  useEffect(() => {
    if (stage === "idle") return;
    gsap.from("[data-hero='pop']", {
      y: 18,
      opacity: 0,
      scale: 0.95,
      duration: 0.45,
      ease: "back.out(1.7)",
      stagger: 0.1,
    });
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [stage]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const approve = () => {
    if (stage !== "idle") return;
    setStage("typing");
    timerRef.current = window.setTimeout(() => setStage("approved"), 1100);
  };

  const replay = () => setStage("idle");

  return (
    <section ref={scope} className="relative pt-40 pb-24 sm:pt-48">
      <div className="bg-grid absolute inset-x-0 top-0 h-[80vh]" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div data-hero="badge">
            <Badge
              variant="secondary"
              className="gap-1.5 rounded-full border border-primary/15 bg-accent px-4 py-1.5 text-accent-foreground"
            >
              <HugeiconsIcon icon={AiBrain01Icon} size={14} strokeWidth={1.8} />
              Multi-agent back office · Human-approved actions
            </Badge>
          </div>

          <h1 className="font-heading mt-8 text-[2.75rem] leading-[1.05] tracking-wide text-foreground sm:text-6xl md:text-7xl xl:text-[5.5rem]">
            <span data-hero="line" className="block">
              Your Back Office,
                      </span>  <span data-hero="line">Run by </span>
                      
            <span
              data-hero="line"
              className=" bg-gradient-to-r from-[rgb(110,67,220)] to-[rgb(128,81,249)] bg-clip-text text-transparent"
            >
              AI Agents.
            </span> <span>🤖</span>
          </h1>

          <p
            data-hero="sub"
            className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
          >
            Deskops AI puts an Orchestrator and four specialist agents to work on
            your customers, invoices, inventory and books - straight from
            WhatsApp. Nothing reaches the real world without your approval.
          </p>

          <div data-hero="cta" className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="btn-purple h-12 border-0 px-7 text-base">
              <Link href="/signup">
                Start for Free
                <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} />
              </Link>
            </Button>
            <Button asChild size="lg" className="btn-dark h-12 border-0 px-7 text-base">
              <a href="#workflow">See how it works</a>
            </Button>
          </div>
        </div>

        {/* Interactive demo: WhatsApp thread + agent trace */}
        <TooltipProvider delayDuration={150}>
          <div data-hero="preview" className="relative mx-auto mt-24 max-w-6xl">
            <div ref={windowRef} className="will-change-transform">
              <Card className="gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-[0_40px_120px_-32px_rgba(110,67,220,0.35)]">
                {/* window chrome */}
                <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-5 py-3.5">
                  <span className="size-3 rounded-full bg-[#f87171] transition-transform hover:scale-125" />
                  <span className="size-3 rounded-full bg-[#fbbf24] transition-transform hover:scale-125" />
                  <span className="size-3 rounded-full bg-[#34d399] transition-transform hover:scale-125" />
                  <span className="ml-3 font-mono text-xs text-muted-foreground">
                    deskops · live demo — try the approve button
                  </span>
                  <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground sm:flex">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#34d399]" />
                    3 agents active
                  </span>
                </div>

                <div className="grid gap-0 lg:min-h-[560px] lg:grid-cols-2">
                  {/* ───── WhatsApp side ───── */}
                  <div className="flex flex-col border-b border-border/70 bg-muted/20 lg:border-r lg:border-b-0">
                    {/* chat header */}
                    <div className="flex items-center gap-3 border-b border-border/60 bg-card px-5 py-3.5">
                      <span className="font-heading flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(110,67,220)] to-[rgb(128,81,249)] text-xs text-white">
                        NH
                      </span>
                      <div className="leading-tight">
                        <div className="text-sm font-semibold">Nimal’s Hardware</div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="size-1.5 rounded-full bg-[#34d399]" />
                          online · replied by Deskops
                        </div>
                      </div>
                      <span className="ml-auto text-[#25D366]">
                        <HugeiconsIcon icon={WhatsappIcon} size={22} strokeWidth={1.8} />
                      </span>
                    </div>

                    {/* messages */}
                    <div
                      ref={chatRef}
                      className="flex max-h-[420px] flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
                    >
                      <div className="mb-1 self-center rounded-full bg-muted px-3 py-1 font-mono text-[10px] text-muted-foreground">
                        Today
                      </div>
                      <ChatBubble data-hero="bubble" side="in" time="09:41">
                        Do you have 50 bags of cement? Need them Friday.
                      </ChatBubble>
                      <ChatBubble data-hero="bubble" side="out" time="09:41" ticks>
                        Yes — 64 bags in stock at LKR 2,450 each. Want me to draft
                        an invoice for 50 with Friday delivery?
                      </ChatBubble>
                      <ChatBubble data-hero="bubble" side="in" time="09:42">
                        Yes please 👍
                      </ChatBubble>
                      <ChatBubble data-hero="bubble" side="out" time="09:42" ticks>
                        Invoice #INV-0218 drafted — it's with the owner for
                        approval. I'll confirm your Friday slot right after. ✅
                      </ChatBubble>
                      {stage === "typing" && <TypingBubble />}
                      {stage === "approved" && (
                        <ChatBubble data-hero="pop" side="out" time="09:43" ticks highlight>
                          Approved! Invoice sent &amp; Friday delivery booked. 🚚
                        </ChatBubble>
                      )}
                    </div>

                    {/* input bar */}
                    <div className="flex items-center gap-2.5 border-t border-border/60 bg-card px-4 py-3">
                      <div className="h-10 flex-1 rounded-full border border-border/70 bg-muted/40 px-4 text-sm leading-10 text-muted-foreground select-none">
                        Message
                      </div>
                      <span className="btn-purple flex size-10 shrink-0 items-center justify-center rounded-full">
                        <HugeiconsIcon icon={SentIcon} size={17} strokeWidth={1.8} />
                      </span>
                    </div>
                  </div>

                  {/* ───── Agent / approval side ───── */}
                  <div className="flex flex-col bg-muted/30 p-6 sm:p-8">
                    <div className="mb-6 flex items-center gap-2.5 text-base font-medium">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                        <HugeiconsIcon
                          icon={AiBrain01Icon}
                          size={20}
                          className="text-primary"
                          strokeWidth={1.8}
                        />
                      </span>
                      Orchestrator trace
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        trace_8f2c…
                      </span>
                    </div>

                    <div className="space-y-3 text-sm">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            data-hero="bubble"
                            className="flex cursor-help items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30"
                          >
                            <HugeiconsIcon icon={PackageIcon} size={18} className="text-primary" strokeWidth={1.8} />
                            <span className="text-muted-foreground">
                              Inventory agent ·{" "}
                              <span className="font-mono text-[13px] text-foreground">
                                checkStock("cement")
                              </span>
                            </span>
                            <span className="ml-auto font-mono text-xs text-[#059669]">64 ✓</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          Typed tool call — zod-validated args, ran in 42&nbsp;ms against your live stock table.
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            data-hero="bubble"
                            className="flex cursor-help items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30"
                          >
                            <HugeiconsIcon icon={InvoiceIcon} size={18} className="text-primary" strokeWidth={1.8} />
                            <span className="text-muted-foreground">
                              Sales agent · invoice drafted ·{" "}
                              <span className="font-medium text-foreground">LKR 122,500</span>
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          50 × LKR 2,450 — computed in code, never by the model.
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            data-hero="bubble"
                            className="flex cursor-help items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30"
                          >
                            <HugeiconsIcon icon={ShieldIcon} size={18} className="text-primary" strokeWidth={1.8} />
                            <span className="text-muted-foreground">
                              Guardrails · totals verified against DB
                            </span>
                            <span className="ml-auto font-mono text-xs text-[#059669]">pass</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          Every number the model echoes is re-checked at the source before it ships.
                        </TooltipContent>
                      </Tooltip>

                      {/* approval card — the interactive bit */}
                      <div
                        data-hero="bubble"
                        className={cn(
                          "relative rounded-xl border-2 p-4 transition-colors duration-300",
                          stage === "approved"
                            ? "border-[#059669]/40 bg-[#059669]/10"
                            : "border-primary/40 bg-card shadow-[0_8px_32px_-12px_rgba(110,67,220,0.45)]"
                        )}
                      >
                        {/* floating hint so nobody misses the button */}
                        {stage === "idle" && (
                          <span
                            data-hero="hint"
                            className="btn-dark absolute -top-4 right-4 z-10 px-3 py-1.5 text-[11px] font-semibold"
                          >
                            👇 Try it — you're the boss
                          </span>
                        )}

                        <div className="flex items-center gap-2.5">
                          <HugeiconsIcon
                            icon={CheckmarkCircle02Icon}
                            size={18}
                            className={stage === "approved" ? "text-[#059669]" : "text-primary"}
                            strokeWidth={1.8}
                          />
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              stage === "approved" ? "text-[#059669]" : "text-foreground"
                            )}
                          >
                            {stage === "approved"
                              ? "Approved · invoice sent to customer"
                              : "Invoice #INV-0218 needs your approval"}
                          </span>
                        </div>
                        <p className="mt-1.5 ml-[30px] text-xs text-muted-foreground">
                          50 × cement @ LKR 2,450 · total LKR 122,500 · Friday delivery
                        </p>

                        {stage !== "approved" ? (
                          <div className="mt-4 ml-[30px] flex items-center gap-3">
                            <span className="relative inline-flex">
                              {/* ping ring advertising clickability */}
                              <span className="absolute inset-0 animate-ping rounded-md bg-primary/40" />
                              <button
                                type="button"
                                onClick={approve}
                                disabled={stage === "typing"}
                                className="btn-purple relative cursor-pointer px-5 py-2.5 text-sm font-semibold transition-transform duration-150 hover:scale-105 active:scale-95 disabled:opacity-70"
                              >
                                {stage === "typing" ? "Sending…" : "Approve & send"}
                              </button>
                            </span>
                            <button
                              type="button"
                              className="cursor-pointer rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              Edit first
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 ml-[30px] flex items-center gap-3" data-hero="pop">
                            <span className="font-mono text-xs text-[#059669]">
                              sent in 0.4s · ledger updated ✓
                            </span>
                            <button
                              type="button"
                              onClick={replay}
                              className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                            >
                              <HugeiconsIcon icon={Refresh01Icon} size={13} strokeWidth={2} />
                              Replay demo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* daily insight strip */}
                    <div
                      data-hero="bubble"
                      className="mt-auto flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-4 pt-4 text-sm"
                    >
                      <HugeiconsIcon
                        icon={ChartLineData01Icon}
                        size={18}
                        className="text-primary"
                        strokeWidth={1.8}
                      />
                      <span className="text-muted-foreground">
                        Today · 14 conversations ·{" "}
                        <span
                          className={cn(
                            "transition-colors",
                            stage === "approved" && "font-medium text-[#059669]"
                          )}
                        >
                          {stage === "approved" ? 7 : 6} invoices
                        </span>{" "}
                        ·{" "}
                        <span className="font-medium text-foreground">
                          LKR {stage === "approved" ? "506,700" : "384,200"} booked
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* floating accent chip */}
            <div
              data-hero="orbit"
              className="btn-dark absolute -top-6 -right-4 hidden items-center gap-2 px-4 py-2.5 text-xs font-medium lg:flex"
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={2} />
              0 actions sent without approval
            </div>
          </div>
        </TooltipProvider>
      </div>
    </section>
  );
}
