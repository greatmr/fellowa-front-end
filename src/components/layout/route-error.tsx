"use client";

import { useTranslations } from "next-intl";

import { ErrorLayout } from "@/components/layout/error-layout";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Re-fetch the failed segment; never render error.message or potentially private diagnostics. */
export function RouteError({ retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("errors");
  const tCommon = useTranslations("common");

  return (
    <ErrorLayout
      title={t("unexpectedTitle")}
      description={t("unexpectedBody")}
      actions={
        <>
          <Button onClick={retry}>{tCommon("retry")}</Button>
          <Button asChild variant="outline">
            <Link href="/">{t("backHome")}</Link>
          </Button>
        </>
      }
    />
  );
}
