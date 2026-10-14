import { AlertCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Generic 404 in the brand (presentation NotFoundView treatment, @5263327).
 * The presentation's creator-specific copy ("this creator removed their page")
 * belongs to the unknown/unpublished creator page — FE-PAGE-01, DS-LAND-01.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex size-16 items-center justify-center rounded-md bg-amber-50 text-amber-500 dark:bg-amber-500/15"
        aria-hidden
      >
        <AlertCircle className="size-7" strokeWidth={1.6} />
      </div>
      <h1 className="text-foreground text-subtitle font-bold">
        {t("notFoundTitle")}
      </h1>
      <p className="text-muted-foreground text-body max-w-sm leading-6">
        {t("notFoundBody")}
      </p>
      <Button asChild className="mt-1">
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </main>
  );
}
