"use client";

import { ThemeProvider } from "next-themes";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useLocale } from "next-intl";

import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { getDirection } from "@/i18n/routing";

/**
 * The single client boundary for app-wide providers. Keep it thin: a provider
 * added here makes the whole tree client-rendered below it, so anything that
 * can stay a server component should not be wrapped by a new provider.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  const direction = getDirection(useLocale());

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <DirectionProvider dir={direction}>
        <QueryProvider>
          {children}
          <Toaster position="top-center" richColors />
        </QueryProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
