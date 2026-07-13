"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  // Realtime invalidation (useRealtimeSync) keeps data live; focus refetch is the cheap fallback.
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
