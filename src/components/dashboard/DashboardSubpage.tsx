import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, ArrowRight02Icon, CheckmarkCircle02Icon, InvoiceIcon, PackageIcon, WhatsappIcon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardShell } from "./DashboardShell";

const copy: Record<string, { title: string; eyebrow: string; description: string; action: string }> = {
  inbox: { title: "Customer inbox", eyebrow: "14 open conversations", description: "Customer messages, agent drafts, and grounded context in one place.", action: "New message" },
  products: { title: "Product catalog", eyebrow: "42 active products", description: "Prices, stock, and supplier details are always ready for your agents.", action: "Add product" },
  inventory: { title: "Inventory", eyebrow: "Stock control", description: "Monitor stock movements and reorder before an item runs out.", action: "Record stock" },
  invoices: { title: "Invoices", eyebrow: "Sales desk", description: "Draft, approve, and track every invoice from a single ledger-backed view.", action: "New invoice" },
  customers: { title: "Customers", eyebrow: "118 customers", description: "Every customer conversation and order history, all together.", action: "Add customer" },
  books: { title: "Books", eyebrow: "Sunday, 12 July", description: "Reliable income and expense records, updated automatically after a sale.", action: "Add entry" },
  approvals: { title: "Approvals", eyebrow: "3 waiting for you", description: "Nothing leaves Deskops until you give the go-ahead.", action: "Review all" },
  settings: { title: "Workspace settings", eyebrow: "Nimal's Hardware", description: "Manage your business profile, team, connections, and AI model preferences.", action: "Save changes" },
};

function resolve(route: string) {
  const [section, detail] = route.split("/");
  const base = copy[section] ?? copy.settings;
  if (!detail) return base;
  const titles: Record<string, string> = { new: `New ${section === "products" ? "product" : "invoice"}`, reorders: "Reorder suggestions", reports: "Business reports", team: "Your team", integrations: "Integrations", models: "AI models" };
  return { ...base, title: titles[detail] ?? `${base.title} detail`, eyebrow: detail === "new" ? "Create draft" : base.eyebrow };
}

export function DashboardSubpage({ route }: { route: string }) {
  const page = resolve(route);
  const isInbox = route.startsWith("inbox");
  const isApprovals = route === "approvals";
  return <DashboardShell><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-10"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-mono text-xs tracking-[0.2em] text-primary uppercase">{page.eyebrow}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{page.title}</h1><p className="mt-3 max-w-2xl text-muted-foreground">{page.description}</p></div><Button className="btn-purple h-10 rounded-md border-0 px-4"><HugeiconsIcon icon={Add01Icon} size={17} /> {page.action}</Button></div><section className="mt-8 grid gap-4 sm:grid-cols-3"><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Waiting on you</p><p className="mt-4 text-3xl font-semibold">{isApprovals ? "3" : "14"}</p><p className="mt-1 text-xs text-[#047857]">Updated just now</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Completed today</p><p className="mt-4 text-3xl font-semibold">8</p><p className="mt-1 text-xs text-muted-foreground">+2 from yesterday</p></CardContent></Card><Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Agent status</p><div className="mt-4 flex items-center gap-2 text-lg font-semibold"><span className="size-2 rounded-full bg-[#34d399]" /> Online</div><p className="mt-1 text-xs text-muted-foreground">Ready to help</p></CardContent></Card></section><section className="mt-7 grid gap-7 xl:grid-cols-[1.45fr_0.75fr]"><Card className="overflow-hidden border-border/80"><div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6"><div><h2 className="font-semibold">{isInbox ? "Latest conversations" : isApprovals ? "Approval queue" : "Recent activity"}</h2><p className="mt-1 text-xs text-muted-foreground">Hardcoded preview data</p></div><Badge variant="secondary" className="rounded-md bg-primary/10 text-primary">Live preview</Badge></div><CardContent className="divide-y divide-border/70 p-0">{["Nimal's Hardware", "Sampath Traders", "Perera Builders"].map((name, index) => <div key={name} className="flex items-center gap-4 px-5 py-4 sm:px-6"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><HugeiconsIcon icon={isInbox ? WhatsappIcon : isApprovals ? CheckmarkCircle02Icon : index === 1 ? InvoiceIcon : PackageIcon} size={19} /></span><div className="min-w-0 flex-1"><p className="font-medium">{isApprovals ? `${index + 1}. Invoice action awaiting approval` : name}</p><p className="mt-1 truncate text-sm text-muted-foreground">{isInbox ? "Can you confirm the delivery for Friday?" : "Updated by your Deskops agents a few minutes ago."}</p></div><Badge variant="secondary" className="rounded-md">{index + 2}m</Badge><HugeiconsIcon icon={ArrowRight02Icon} size={16} className="text-muted-foreground" /></div>)}</CardContent></Card><Card className="surface-dark border-0 text-white"><CardContent className="p-6"><p className="font-mono text-xs tracking-[0.2em] text-white/45 uppercase">Agent assist</p><h2 className="mt-4 text-2xl font-semibold leading-tight">Your agents have<br /><span className="text-[rgb(160,124,255)]">the context.</span></h2><p className="mt-3 text-sm leading-6 text-white/60">Every action uses real products, customers, and books data before it reaches your approval queue.</p><Button className="btn-purple mt-6 h-11 rounded-md border-0 px-5">Open agent desk <HugeiconsIcon icon={ArrowRight02Icon} size={17} /></Button></CardContent></Card></section></main></DashboardShell>;
}
