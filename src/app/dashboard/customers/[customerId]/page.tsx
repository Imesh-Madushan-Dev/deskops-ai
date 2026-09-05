import { redirect } from "next/navigation";

/** Customer profiles open in a sheet on the directory now; this keeps old links working. */
export default async function CustomerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  redirect(`/dashboard/customers?c=${customerId}`);
}
