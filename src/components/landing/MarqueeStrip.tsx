"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";

const words = ["Customers", "Invoices", "Inventory", "Books", "Approvals", "Insights"];

export function MarqueeStrip() {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to("[data-marquee='track']", {
        xPercent: -50,
        ease: "none",
        duration: 28,
        repeat: -1,
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  const sequence = [...words, ...words];

  return (
    <div ref={scope} className="overflow-hidden py-12 select-none sm:py-16">
      <div className="-mx-8 -rotate-3 border-y border-border/70 bg-card py-6 shadow-[0_16px_48px_-24px_rgba(110,67,220,0.3)]">
        <div data-marquee="track" className="flex w-max items-center gap-10 whitespace-nowrap">
        {[0, 1].map((half) => (
          <div key={half} className="flex items-center gap-10" aria-hidden={half === 1}>
            {sequence.map((word, i) => (
              <span key={`${half}-${i}`} className="flex items-center gap-10">
                <span
                  className={
                    i % 2 === 0
                      ? "font-heading text-3xl tracking-widest text-foreground/80 uppercase sm:text-4xl"
                      : "font-heading text-outline text-3xl tracking-widest uppercase sm:text-4xl"
                  }
                >
                  {word}
                </span>
                <span className="size-2 rounded-full bg-primary/50" />
              </span>
            ))}
          </div>
        ))}
        </div>
      </div>
    </div>
  );
}
