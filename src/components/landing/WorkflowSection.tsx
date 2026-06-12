"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  WhatsappIcon,
  AiBrain01Icon,
  WorkflowSquare01Icon,
  ShieldIcon,
  CheckmarkBadge02Icon,
} from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";

type Step = {
  icon: IconSvgElement;
  title: string;
  detail: string;
  meta: string;
};

const steps: Step[] = [
  {
    icon: WhatsappIcon,
    title: "A message arrives",
    detail:
      "A customer or you texts the business WhatsApp number. The webhook is verified, deduplicated and queued — nothing blocks.",
    meta: "waha webhook · verified",
  },
  {
    icon: AiBrain01Icon,
    title: "The Orchestrator reads intent",
    detail:
      "It classifies what's being asked and picks the specialist agents and tools needed — a capped multi-step loop, never an open-ended one.",
    meta: "intent → plan · maxSteps capped",
  },
  {
    icon: WorkflowSquare01Icon,
    title: "Tools do the real work",
    detail:
      "Stock checks, invoice math and ledger entries run as typed, validated functions against your data. Models format; code computes.",
    meta: "zod-validated · deterministic math",
  },
  {
    icon: ShieldIcon,
    title: "Guardrails screen the result",
    detail:
      "Every number is verified against the database and every outbound draft is checked before it can go anywhere near a customer.",
    meta: "verify · redact · rate-limit",
  },
  {
    icon: CheckmarkBadge02Icon,
    title: "You approve. Then it ships.",
    detail:
      "Money and messages always stop at your approval queue. One tap on your phone sends it — the agent never acts autonomously.",
    meta: "human-in-the-loop · idempotent",
  },
];

export function WorkflowSection() {
  const scope = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // progress line draws as you scroll the list
      gsap.from("[data-flow='line']", {
        scaleY: 0,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: {
          trigger: "[data-flow='list']",
          start: "top 70%",
          end: "bottom 55%",
          scrub: true,
        },
      });

      gsap.utils.toArray<HTMLElement>("[data-flow='step']").forEach((el) => {
        gsap.from(el, {
          x: -40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 80%" },
        });
      });

      gsap.from("[data-flow='head']", {
        y: 40,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: { trigger: "[data-flow='head']", start: "top 85%" },
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={scope} id="workflow" className="surface-dark relative py-28 text-white sm:py-36">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div
          className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
          data-flow="head"
        >
          <div className="max-w-2xl">
            <Badge className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-white">
              How it works
            </Badge>
            <h2 className="font-heading mt-5 text-4xl leading-[1.1] tracking-wide sm:text-5xl md:text-6xl">
              From "Hi, do you have…"
              <br />
              <span className="text-white/40">to a Done Deal.</span>
            </h2>
          </div>
          <p className="max-w-sm text-white/60 sm:pb-2">
            Five stops between an incoming message and a real-world action — and
            the last one is always you.
          </p>
        </div>

        <div data-flow="list" className="relative mx-auto mt-20 max-w-3xl">
          <div className="absolute top-2 bottom-2 left-[27px] w-px bg-white/15" aria-hidden />
          <div
            data-flow="line"
            className="absolute top-2 bottom-2 left-[27px] w-px bg-gradient-to-b from-[rgb(110,67,220)] to-[rgb(128,81,249)]"
            aria-hidden
          />

          <ol className="space-y-14">
            {steps.map((step, i) => (
              <li key={step.title} data-flow="step" className="relative flex gap-6 sm:gap-8">
                <span className="btn-purple z-10 flex size-14 shrink-0 items-center justify-center">
                  <HugeiconsIcon icon={step.icon} size={24} strokeWidth={1.8} />
                </span>
                <div className="relative pt-1">
                  <span
                    className="font-heading pointer-events-none absolute -top-6 right-0 text-7xl tracking-wider text-white/[0.05] select-none sm:-top-10 sm:text-9xl"
                    aria-hidden
                  >
                    0{i + 1}
                  </span>
                  <h3 className="font-heading text-xl tracking-wider sm:text-2xl">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 max-w-xl text-[15px] leading-7 text-white/60">
                    {step.detail}
                  </p>
                  <span className="mt-3 inline-block rounded-md bg-white/10 px-2.5 py-1 font-mono text-[11px] text-white/60">
                    {step.meta}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
