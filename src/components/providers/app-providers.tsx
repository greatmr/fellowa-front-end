"use client";

import { ThemeProvider } from "next-themes";

import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";

/**
 * The single client boundary for app-wide providers. Keep it thin: a provider
 * added here makes the whole tree client-rendered below it, so anything that
 * can stay a server component should not be wrapped by a new provider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryProvider>
        {children}
        <Toaster position="top-center" richColors />
      </QueryProvider>
    </ThemeProvider>
  );
}
