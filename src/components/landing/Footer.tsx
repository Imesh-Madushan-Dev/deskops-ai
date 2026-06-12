import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AiBrain01Icon,
  GithubIcon,
  NewTwitterIcon,
  Linkedin02Icon,
} from "@hugeicons/core-free-icons";
import { Separator } from "@/components/ui/separator";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Agents", href: "#agents" },
      { label: "How it works", href: "#workflow" },
      { label: "Platform", href: "#features" },
      { label: "FAQ", href: "#faq" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Contact", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
    ],
  },
];

const socials = [
  { icon: GithubIcon, href: "https://github.com", label: "GitHub" },
  { icon: NewTwitterIcon, href: "https://x.com", label: "X" },
  { icon: Linkedin02Icon, href: "https://linkedin.com", label: "LinkedIn" },
];

export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-10 md:flex-row">
          <div className="max-w-xs">
            <Link href="/" className="flex items-center gap-2">
              <span className="btn-purple flex size-8 items-center justify-center">
                <HugeiconsIcon icon={AiBrain01Icon} size={18} color="#fff" strokeWidth={1.8} />
              </span>
              <span className="font-heading text-sm tracking-wider">
                Deskops <span className="text-primary">AI</span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              A multi-agent AI back office for small businesses — customers,
              invoices, inventory and books, with you in the approval seat.
            </p>
          </div>

          <div className="flex gap-16">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="font-heading text-xs tracking-widest text-foreground uppercase">
                  {col.title}
                </h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Deskops AI. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            {socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                aria-label={social.label}
                className="flex size-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
              >
                <HugeiconsIcon icon={social.icon} size={16} strokeWidth={1.8} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
