import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";

export function PageHeaderBar({ title, action, backHref }: { title: string; action?: React.ReactNode; backHref?: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
          </Link>
        )}
        <div className="flex items-center gap-3 lg:hidden">
          <span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={18} /></span>
          <span className="text-sm font-semibold tracking-wide">Deskops AI</span>
        </div>
        <nav aria-label="Breadcrumb" className="hidden items-center gap-2 text-sm lg:flex">
          <span className="text-muted-foreground">Dashboard</span>
          <span className="text-muted-foreground/40">/</span>
          <span className="font-medium text-foreground">{title}</span>
        </nav>
      </div>
      <div className="flex items-center gap-2">{action}</div>
    </header>
  );
}

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}
