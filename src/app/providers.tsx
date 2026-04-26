"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AlertsManager } from "@/components/Alerts/AlertsManager";
import { ErrorReporter } from "@/components/ErrorReporter";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <ErrorReporter />
      <AlertsManager />
      {children}
    </QueryClientProvider>
  );
}
