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

export function HeroSection() {
  const scope = useRef<HTMLElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
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
          { y: 16, opacity: 0, stagger: 0.14, duration: 0.5 },
          "-=0.6"
        );

      gsap.to("[data-hero='orbit']", {
        y: -12,
        repeat: -1,
        yoyo: true,
        duration: 2.6,
        ease: "sine.inOut",
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  // subtle 3D tilt following the cursor over the window
  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    const qx = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: "power3.out" });
    const qy = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: "power3.out" });
    gsap.set(el, { transformPerspective: 1400 });

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      qx(x * 5);
      qy(y * -5);
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

  // pop in the confirmation bubble after approving
  useEffect(() => {
    if (!approved) return;
    gsap.from("[data-hero='approved-pop']", {
      y: 18,
      opacity: 0,
      scale: 0.96,
      duration: 0.5,
      ease: "back.out(1.6)",
      stagger: 0.12,
    });
  }, [approved]);

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
            </span>
            <span
              data-hero="line"
              className="block bg-gradient-to-r from-[rgb(110,67,220)] to-[rgb(128,81,249)] bg-clip-text text-transparent"
            >
              Run by AI Agents.
            </span>
          </h1>

          <p
            data-hero="sub"
            className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
          >
            Deskops AI puts an Orchestrator and four specialist agents to work on
            your customers, invoices, inventory and books — straight from
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

        {/* Interactive preview: WhatsApp thread + agent trace + insight bar */}
        <TooltipProvider delayDuration={150}>
          <div data-hero="preview" className="relative mx-auto mt-24 max-w-6xl">
            <div ref={windowRef} className="will-change-transform">
              <Card className="gap-0 overflow-hidden rounded-2xl border-border/80 p-0 shadow-[0_40px_120px_-32px_rgba(110,67,220,0.35)]">
                <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-5 py-3.5">
                  <span className="size-3 rounded-full bg-[#f87171] transition-transform hover:scale-125" />
                  <span className="size-3 rounded-full bg-[#fbbf24] transition-transform hover:scale-125" />
                  <span className="size-3 rounded-full bg-[#34d399] transition-transform hover:scale-125" />
                  <span className="ml-3 font-mono text-xs text-muted-foreground">
                    deskops · live session
                  </span>
                  <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground sm:flex">
                    <span className="size-1.5 animate-pulse rounded-full bg-[#34d399]" />
                    3 agents active
                  </span>
                </div>

                <div className="grid gap-0 lg:min-h-[560px] lg:grid-cols-2">
                  {/* WhatsApp side */}
                  <div className="flex flex-col border-b border-border/70 p-6 sm:p-9 lg:border-r lg:border-b-0">
                    <div className="mb-7 flex items-center gap-2.5 text-base font-medium">
                      <span className="flex size-9 items-center justify-center rounded-full bg-[#25D366]/10">
                        <HugeiconsIcon
                          icon={WhatsappIcon}
                          size={20}
                          className="text-[#25D366]"
                          strokeWidth={1.8}
                        />
                      </span>
                      WhatsApp · Nimal’s Hardware
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        09:42
                      </span>
                    </div>
                    <div className="space-y-4 text-[15px]">
                      <div
                        data-hero="bubble"
                        className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        Do you have 50 bags of cement? Need them Friday.
                      </div>
                      <div
                        data-hero="bubble"
                        className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-accent-foreground transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        Yes — 64 bags in stock at LKR 2,450 each. Want me to draft
                        an invoice for 50 with Friday delivery?
                      </div>
                      <div
                        data-hero="bubble"
                        className="max-w-[85%] rounded-2xl rounded-tl-md bg-muted px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        Yes please 👍
                      </div>
                      <div
                        data-hero="bubble"
                        className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-accent px-4 py-3 text-accent-foreground transition-transform duration-200 hover:-translate-y-0.5"
                      >
                        Invoice #INV-0218 drafted — it's with the owner for
                        approval. I'll confirm your Friday slot right after. ✅
                      </div>
                      {approved && (
                        <div
                          data-hero="approved-pop"
                          className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#25D366]/15 px-4 py-3 text-foreground"
                        >
                          Approved! Invoice sent &amp; Friday delivery booked. 🚚
                        </div>
                      )}
                    </div>
                    <div className="mt-auto flex items-center gap-2 pt-7">
                      <div className="h-10 flex-1 rounded-full border border-border/70 bg-muted/40 px-4 text-sm leading-10 text-muted-foreground select-none">
                        Customer is typing…
                      </div>
                    </div>
                  </div>

                  {/* Agent / approval side */}
                  <div className="flex flex-col bg-muted/30 p-6 sm:p-9">
                    <div className="mb-7 flex items-center gap-2.5 text-base font-medium">
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

                      <div
                        data-hero="bubble"
                        className={cn(
                          "flex items-center gap-3 rounded-xl border px-4 py-4 transition-colors duration-300",
                          approved
                            ? "border-[#059669]/30 bg-[#059669]/10"
                            : "border-primary/30 bg-accent/60"
                        )}
                      >
                        <HugeiconsIcon
                          icon={CheckmarkCircle02Icon}
                          size={18}
                          className={approved ? "text-[#059669]" : "text-primary"}
                          strokeWidth={1.8}
                        />
                        <span
                          className={cn(
                            "font-medium",
                            approved ? "text-[#059669]" : "text-accent-foreground"
                          )}
                        >
                          {approved ? "Approved · invoice sent" : "Awaiting your approval"}
                        </span>
                        {approved ? (
                          <span
                            data-hero="approved-pop"
                            className="ml-auto font-mono text-xs text-[#059669]"
                          >
                            done ✓
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setApproved(true)}
                            className="btn-purple ml-auto cursor-pointer px-3.5 py-2 text-xs font-medium active:translate-y-px"
                          >
                            Approve
                          </button>
                        )}
                      </div>
                    </div>

                    {/* daily insight strip */}
                    <div
                      data-hero="bubble"
                      className="mt-auto flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-4 text-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30"
                    >
                      <HugeiconsIcon
                        icon={ChartLineData01Icon}
                        size={18}
                        className="text-primary"
                        strokeWidth={1.8}
                      />
                      <span className="text-muted-foreground">
                        Today · 14 conversations · {approved ? 7 : 6} invoices ·{" "}
                        <span className="font-medium text-foreground">
                          LKR {approved ? "506,700" : "384,200"} booked
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
