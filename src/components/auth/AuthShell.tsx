"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  CheckmarkCircle02Icon,
  WhatsappIcon,
  ShieldIcon,
  ArrowRight02Icon,
} from "@hugeicons/core-free-icons";

const highlights = [
  { icon: WhatsappIcon, text: "Agents answer on your WhatsApp number" },
  { icon: ShieldIcon, text: "Every number verified against your books" },
  { icon: CheckmarkCircle02Icon, text: "Nothing sends without your approval" },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out", duration: 0.8 } })
        .from("[data-auth='brand']", { x: -40, opacity: 0 })
        .from("[data-auth='highlight']", { x: -24, opacity: 0, stagger: 0.1 }, "-=0.5")
        .from("[data-auth='panel']", { y: 32, opacity: 0 }, "-=0.7");
    }, scope);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={scope} className="flex min-h-screen w-full">
      {/* Brand panel */}
      <aside className="surface-dark relative hidden w-[44%] flex-col justify-between p-10 text-white lg:flex xl:p-14">
        <Link href="/" data-auth="brand" className="flex w-fit items-center gap-2.5">
          <span className="btn-purple flex size-9 items-center justify-center rounded-full">
            <HugeiconsIcon icon={AiBrain01Icon} size={18} color="#fff" strokeWidth={1.8} />
          </span>
          <span className="font-heading text-sm tracking-wider">
            Deskops <span className="text-[rgb(160,124,255)]">AI</span>
          </span>
        </Link>

        <div>
          <h2
            data-auth="brand"
            className="font-heading max-w-md text-4xl leading-[1.12] tracking-wide xl:text-5xl"
          >
            The Back Office
            <br />
            <span className="text-white/40">That Never Clocks Out.</span>
          </h2>
          <ul className="mt-10 space-y-4">
            {highlights.map((item) => (
              <li
                key={item.text}
                data-auth="highlight"
                className="flex items-center gap-3 text-sm text-white/70"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10">
                  <HugeiconsIcon icon={item.icon} size={17} strokeWidth={1.8} />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <Link
          href="/"
          data-auth="brand"
          className="group flex w-fit items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <HugeiconsIcon
            icon={ArrowRight02Icon}
            size={16}
            strokeWidth={2}
            className="rotate-180 transition-transform group-hover:-translate-x-1"
          />
          Back to home
        </Link>
      </aside>

      {/* Form panel */}
      <main className="relative flex flex-1 items-center justify-center px-5 py-14 sm:px-10">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div data-auth="panel" className="relative w-full max-w-md">
          <Link href="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <span className="btn-purple flex size-9 items-center justify-center rounded-full">
              <HugeiconsIcon icon={AiBrain01Icon} size={18} color="#fff" strokeWidth={1.8} />
            </span>
            <span className="font-heading text-sm tracking-wider">
              Deskops <span className="text-primary">AI</span>
            </span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
