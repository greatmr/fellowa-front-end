"use client";

import { useTranslations } from "next-intl";

import { ErrorState } from "@/components/common/error-state";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = useTranslations("common");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4">
      <ErrorState
        className="border-0 bg-transparent"
        action={
          <Button onClick={reset} variant="outline">
            {t("retry")}
          </Button>
        }
      />
    </main>
  );
}
