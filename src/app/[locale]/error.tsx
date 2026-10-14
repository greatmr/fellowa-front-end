"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold">{t("errors.unexpectedTitle")}</h1>
      <p className="text-muted-foreground text-sm">
        {t("errors.unexpectedBody")}
      </p>
      <Button onClick={reset} variant="outline">
        {t("common.retry")}
      </Button>
    </main>
  );
}
