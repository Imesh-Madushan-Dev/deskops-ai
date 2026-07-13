"use client";

import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  BubbleChatIcon,
  ChartLineData01Icon,
  CheckmarkCircle02Icon,
  Home01Icon,
  InvoiceIcon,
  PackageIcon,
  Settings02Icon,
  UserGroupIcon,
  WhatsappIcon,
} from "@hugeicons/core-free-icons";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { useProducts } from "@/lib/query/products";
import { useCustomers } from "@/lib/query/customers";
import { useInvoices } from "@/lib/query/invoices";
import { contactLabel } from "@/lib/utils/contact";

const pages = [
  { label: "Overview", href: "/dashboard", icon: Home01Icon },
  { label: "Inbox", href: "/dashboard/inbox", icon: WhatsappIcon },
  { label: "Approvals", href: "/dashboard/approvals", icon: CheckmarkCircle02Icon },
  { label: "Invoices", href: "/dashboard/invoices", icon: InvoiceIcon },
  { label: "Customers", href: "/dashboard/customers", icon: UserGroupIcon },
  { label: "Products", href: "/dashboard/products", icon: PackageIcon },
  { label: "Inventory", href: "/dashboard/inventory", icon: PackageIcon },
  { label: "Books", href: "/dashboard/books", icon: ChartLineData01Icon },
  { label: "Settings", href: "/dashboard/settings", icon: Settings02Icon },
];

export function CommandPalette({ open, onOpenChange, onOpenCopilot }: { open: boolean; onOpenChange: (open: boolean) => void; onOpenCopilot: () => void }) {
  const router = useRouter();
  // Cached lists power search; they're already loaded by their pages or fetch once here.
  const { data: products } = useProducts();
  const { data: customers } = useCustomers();
  const { data: invoices } = useInvoices();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Search and jump anywhere">
      <CommandInput placeholder="Search products, customers, invoices — or jump to a page…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go("/dashboard/invoices/new")}><HugeiconsIcon icon={Add01Icon} size={16} /> New invoice</CommandItem>
          <CommandItem onSelect={() => go("/dashboard/products?new=1")}><HugeiconsIcon icon={Add01Icon} size={16} /> Add product</CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); onOpenCopilot(); }}><HugeiconsIcon icon={BubbleChatIcon} size={16} /> Ask the copilot</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {pages.map((page) => (
            <CommandItem key={page.href} onSelect={() => go(page.href)}><HugeiconsIcon icon={page.icon} size={16} /> {page.label}</CommandItem>
          ))}
        </CommandGroup>
        {!!products?.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Products">
              {products.slice(0, 30).map((p) => (
                <CommandItem key={p.id} value={`product ${p.name} ${p.sku ?? ""}`} onSelect={() => go(`/dashboard/products/${p.id}`)}>
                  <HugeiconsIcon icon={PackageIcon} size={16} /> {p.name}
                  <span className="ml-auto font-mono text-xs text-muted-foreground">{p.stock_qty} in stock</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {!!customers?.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers">
              {customers.slice(0, 30).map((c) => (
                <CommandItem key={c.id} value={`customer ${c.name ?? ""} ${c.whatsapp_number}`} onSelect={() => go(`/dashboard/customers/${c.id}`)}>
                  <HugeiconsIcon icon={UserGroupIcon} size={16} /> {contactLabel(c)}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {!!invoices?.length && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Invoices">
              {invoices.slice(0, 30).map((inv) => (
                <CommandItem key={inv.id} value={`invoice ${inv.number} ${contactLabel(inv.customers)}`} onSelect={() => go(`/dashboard/invoices/${inv.id}`)}>
                  <HugeiconsIcon icon={InvoiceIcon} size={16} /> {inv.number}
                  <span className="ml-auto text-xs text-muted-foreground capitalize">{inv.status}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
