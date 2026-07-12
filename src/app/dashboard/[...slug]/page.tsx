import { DashboardSubpage } from "@/components/dashboard/DashboardSubpage";

const routes = ["inbox", "inbox/conversation-001", "products", "products/new", "products/product-001", "inventory", "inventory/reorders", "invoices", "invoices/new", "invoices/inv-0218", "customers", "customers/customer-001", "books", "books/reports", "approvals", "settings", "settings/team", "settings/integrations", "settings/models"];

export function generateStaticParams() { return routes.map((route) => ({ slug: route.split("/") })); }

export default async function DashboardRoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  return <DashboardSubpage route={slug.join("/")} />;
}
