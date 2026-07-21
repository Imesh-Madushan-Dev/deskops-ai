"use client";

/** Shared building blocks for every dashboard page — one visual system, defined once. */

import { createContext, useContext } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import { Alert02Icon, ArrowUpRight01Icon, InvoiceIcon, Menu01Icon, PackageIcon, Search01Icon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

/* ---------- shell context: pages talk to the shell (mobile nav, ⌘K) ---------- */

export const ShellContext = createContext<{ openNav: () => void; openPalette: () => void }>({ openNav: () => {}, openPalette: () => {} });

/* ---------- page chrome ---------- */

export function PageShell({ crumbs, actions, children, width = "max-w-7xl" }: { crumbs: (string | { label: string; href: string })[]; actions?: React.ReactNode; children: React.ReactNode; width?: string }) {
  const shell = useContext(ShellContext);
  return (
    <>
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
        <button type="button" onClick={shell.openNav} aria-label="Open menu" className="flex size-9 items-center justify-center rounded-lg border border-border/70 text-muted-foreground lg:hidden">
          <HugeiconsIcon icon={Menu01Icon} size={18} />
        </button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-muted-foreground sm:inline">Deskops</span>
          <span className="hidden text-muted-foreground/40 sm:inline">/</span>
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1;
            const label = typeof crumb === "string" ? crumb : crumb.label;
            return (
              <span key={label} className="flex min-w-0 items-center gap-2">
                {typeof crumb === "object" && !last ? (
                  <Link href={crumb.href} className="truncate text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
                ) : (
                  <span className={cn("truncate", last ? "font-medium" : "text-muted-foreground")}>{label}</span>
                )}
                {!last && <span className="text-muted-foreground/40">/</span>}
              </span>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={shell.openPalette}
            className="hidden h-9 items-center gap-6 rounded-lg border border-border/70 bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground md:flex"
          >
            <span className="flex items-center gap-2"><HugeiconsIcon icon={Search01Icon} size={15} /> Search or jump to…</span>
            <Kbd>⌘K</Kbd>
          </button>
          {actions}
        </div>
      </header>
      <main className={cn("mx-auto w-full px-4 py-6 sm:px-6 sm:py-8", width)}>{children}</main>
    </>
  );
}

export function PageIntro({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {eyebrow && <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------- surfaces ---------- */

export function Panel({ title, sub, action, children, className, bodyClassName }: { title?: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, icon, href, tone = "default" }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon: IconSvgElement; href?: string; tone?: "default" | "brand" }) {
  const body = (
    <div className={cn("group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-colors", tone === "brand" ? "border-primary/25 bg-primary/[0.04]" : "border-border/70 bg-card", href && "hover:border-primary/40")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><HugeiconsIcon icon={icon} size={16} strokeWidth={1.8} /></span>
      </div>
      <p className="mt-4 font-mono text-[26px] font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex h-4 items-center text-xs text-muted-foreground">{hint}</div>
      {href && <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} className="absolute right-4 bottom-4 text-muted-foreground/0 transition-colors group-hover:text-primary" />}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({ icon, title, hint, action, className }: { icon: IconSvgElement; title: string; hint?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-muted-foreground"><HugeiconsIcon icon={icon} size={20} strokeWidth={1.6} /></span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs text-muted-foreground">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- atoms ---------- */

const pillTones = {
  ok: "bg-[#047857]/10 text-[#047857] dark:bg-[#34d399]/15 dark:text-[#34d399]",
  warn: "bg-[#b45309]/10 text-[#b45309] dark:bg-[#d97706]/20 dark:text-[#fbbf24]",
  bad: "bg-destructive/10 text-destructive",
  brand: "bg-primary/10 text-primary",
  neutral: "bg-muted text-muted-foreground",
} as const;

export function StatusPill({ tone = "neutral", dot = true, children, className }: { tone?: keyof typeof pillTones; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium capitalize", pillTones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name.replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "#";
  return <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary", className)}>{initials}</span>;
}

export function SearchField({ value, onChange, placeholder = "Search…", className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <HugeiconsIcon icon={Search01Icon} size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-9 rounded-lg pl-9" />
    </div>
  );
}

export function FilterChips<T extends string>({ options, value, onChange }: { options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
            value === opt.value ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {opt.label}
          {typeof opt.count === "number" && <span className="font-mono tabular-nums opacity-70">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ---------- approvals: shared labels ---------- */

export const approvalMeta: Record<string, { label: string; icon: IconSvgElement }> = {
  send_message: { label: "WhatsApp reply", icon: WhatsappIcon },
  send_invoice: { label: "Send invoice", icon: InvoiceIcon },
  mark_invoice_paid: { label: "Mark invoice paid", icon: InvoiceIcon },
  reorder: { label: "Create reorder", icon: PackageIcon },
  customer_request: { label: "Customer request", icon: Alert02Icon },
};

export function describeApproval(payload: Record<string, unknown>) {
  if (typeof payload.body === "string") return payload.body;
  if (typeof payload.invoiceId === "string") return `Invoice ${payload.invoiceId}`;
  return JSON.stringify(payload);
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return "—";
  }
}
