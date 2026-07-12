import { HugeiconsIcon } from "@hugeicons/react";
import { AiBrain01Icon } from "@hugeicons/core-free-icons";

export function PageHeaderBar({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex h-18 items-center justify-between border-b border-border/70 bg-background/85 px-4 backdrop-blur-xl sm:px-8">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="btn-purple flex size-9 items-center justify-center rounded-xl"><HugeiconsIcon icon={AiBrain01Icon} size={18} /></span>
        <span className="text-sm font-semibold tracking-wide">Deskops AI</span>
      </div>
      <p className="hidden font-mono text-xs tracking-[0.15em] text-muted-foreground uppercase lg:block">{title}</p>
      <div>{action}</div>
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
