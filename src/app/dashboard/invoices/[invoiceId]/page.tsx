import { redirect } from "next/navigation";

/** The invoice view is a sheet on the list page now; this keeps old links and bookmarks working. */
export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  redirect(`/dashboard/invoices?invoice=${invoiceId}`);
}
