import { ProductDetailView } from "@/components/products/ProductDetailView";

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return <ProductDetailView productId={productId} />;
}
