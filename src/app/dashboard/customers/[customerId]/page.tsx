import { CustomerDetailView } from "@/components/customers/CustomerDetailView";

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  return <CustomerDetailView customerId={customerId} />;
}
