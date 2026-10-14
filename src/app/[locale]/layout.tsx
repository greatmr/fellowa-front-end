import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { AppProviders } from "@/components/providers/app-providers";
import { getDirection, routing } from "@/i18n/routing";

import "../globals.css";

export const metadata: Metadata = {
  title: "Fellowa",
  description: "Creator subscription platform",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      dir={getDirection(locale)}
      className="h-full"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <AppProviders>{children}</AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
