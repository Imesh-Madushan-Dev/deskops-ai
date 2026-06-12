"use client";

import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight02Icon } from "@hugeicons/core-free-icons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useReveal } from "./use-reveal";

const faqs = [
  {
    q: "Can the AI send messages or invoices on its own?",
    a: "No. Every money or message action writes to an approval queue and waits for you. One tap approves it; until then, nothing leaves the building. That rule is enforced in the platform, not the prompt.",
  },
  {
    q: "What stops it from inventing prices or totals?",
    a: "Math never happens in the model. Totals, tax and stock changes are computed by typed functions against your database, and any number the model echoes is verified against the source before it's shown or sent.",
  },
  {
    q: "Do my customers need to install anything?",
    a: "No — they keep texting the WhatsApp number your business already uses. Deskops sits behind it, and you manage approvals from a mobile-first dashboard.",
  },
  {
    q: "How does it know about my products and policies?",
    a: "You import your catalog and documents once; Deskops retrieves grounded context from them on every conversation instead of guessing. Content is re-indexed only when it actually changes.",
  },
  {
    q: "What about my data and costs?",
    a: "Every business's data is isolated with row-level security, phone numbers are redacted from logs, and each business has a daily model-spend ceiling with full per-request usage tracking.",
  },
];

export function FaqSection() {
  const scope = useReveal<HTMLElement>();

  return (
    <section ref={scope} id="faq" className="relative py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          {/* Sticky intro column */}
          <div data-reveal>
            <div className="lg:sticky lg:top-32">
              <Badge
                variant="secondary"
                className="rounded-full border border-primary/15 bg-accent px-4 py-1.5 text-accent-foreground"
              >
                FAQ
              </Badge>
              <h2 className="font-heading mt-5 text-4xl leading-[1.1] tracking-wide sm:text-5xl md:text-6xl">
                Fair
                <br />
                <span className="text-outline">Questions.</span>
              </h2>
              <p className="mt-5 max-w-sm text-muted-foreground">
                The ones every owner asks before letting an AI anywhere near
                their money.
              </p>
              <Button asChild className="btn-purple mt-8 h-11 border-0 px-6">
                <Link href="/signup">
                  Ask by trying it
                  <HugeiconsIcon icon={ArrowRight02Icon} size={16} strokeWidth={2} />
                </Link>
              </Button>
            </div>
          </div>

          {/* Numbered accordion */}
          <div data-reveal data-reveal-delay="0.1">
            <Accordion type="single" collapsible className="w-full border-0 space-y-4">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={faq.q}
                  value={`item-${i}`}
                  className="rounded-2xl border border-border/80 bg-card px-6 transition-colors duration-300 last:border-b data-[state=open]:border-primary/30 sm:px-8"
                >
                  <AccordionTrigger className="gap-5 py-6 hover:no-underline">
                    <span className="flex items-baseline gap-5 text-left">
                      <span className="font-mono text-sm text-primary">0{i + 1}</span>
                      <span className="font-heading text-base tracking-wide sm:text-lg">
                        {faq.q}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-7 pl-9 text-[15px] leading-7 text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
