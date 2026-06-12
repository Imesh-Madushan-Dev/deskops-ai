"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { href: "#agents", label: "Agents" },
  { href: "#workflow", label: "How it works" },
  { href: "#features", label: "Platform" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 px-4 sm:top-5">
      <nav
        className={cn(
          "mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border pr-2 pl-5 transition-all duration-300",
          scrolled
            ? "border-border/80 bg-background/85 shadow-[0_12px_40px_-12px_rgba(20,20,40,0.18)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <span className="btn-purple flex size-8 items-center justify-center rounded-full">
            <HugeiconsIcon icon={AiBrain01Icon} size={17} color="#fff" strokeWidth={1.8} />
          </span>
          <span className="font-heading text-sm tracking-wider">
            Deskops <span className="text-primary">AI</span>
          </span>
        </Link>

        <ul className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" className="hidden rounded-full sm:inline-flex">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="btn-purple h-10 rounded-full border-0 px-5">
            <Link href="/signup">Start for Free</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
