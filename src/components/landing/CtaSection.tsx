"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useReveal } from "./use-reveal";

export function CtaSection() {
  const scope = useReveal<HTMLElement>();

  return (
    <section ref={scope} className="px-4 pb-28 sm:px-6">
      <div
        data-reveal
        className="surface-dark relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-20 sm:px-12 sm:py-28"
      >
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs tracking-[0.3em] text-white/50 uppercase">
            The future is a smaller back office
          </p>
          <h2 className="font-heading mt-6 text-4xl leading-[1.08] tracking-wide text-white sm:text-6xl md:text-7xl">
            Hire Your
            <br />
            <span className="bg-gradient-to-r from-[rgb(140,96,252)] to-[rgb(180,150,255)] bg-clip-text text-transparent">
              AI Back Office.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/65">
            Plug in your WhatsApp number, import your catalog, and let the
            agents take the busywork — while every decision stays yours.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="btn-purple h-12 border-0 px-7 text-base">
              <Link href="/signup">
                Start for Free
                <HugeiconsIcon icon={ArrowRight02Icon} size={18} strokeWidth={2} />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="h-12 rounded-md px-7 text-base text-white hover:bg-white/10 hover:text-white"
            >
              <a href="#workflow">
                <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={2} />
                Watch a conversation
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
