"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Scroll-reveals every `[data-reveal]` descendant of the returned ref.
 * Optional `data-reveal-delay` (seconds) staggers siblings sharing a trigger.
 */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils
        .toArray<HTMLElement>("[data-reveal]")
        .forEach((el) => {
          gsap.from(el, {
            y: 36,
            opacity: 0,
            duration: 0.9,
            ease: "power3.out",
            delay: Number(el.dataset.revealDelay ?? 0),
            scrollTrigger: { trigger: el, start: "top 85%" },
          });
        });
    }, ref);
    return () => ctx.revert();
  }, []);

  return ref;
}
