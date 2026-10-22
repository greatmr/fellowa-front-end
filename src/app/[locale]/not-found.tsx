import { getTranslations } from "next-intl/server";

import { ErrorLayout } from "@/components/layout/error-layout";
import { Logo } from "@/components/layout/logo";
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
    <main id="main-content" tabIndex={-1} className="flex flex-1 items-center">
      <ErrorLayout
        variant="not-found"
        brand={
          <Link
            href="/"
            className="focus-visible:outline-ring rounded-md focus-visible:outline-2"
          >
            <Logo />
          </Link>
        }
        title={t("notFoundTitle")}
        description={t("notFoundBody")}
        actions={
          <Button asChild>
            <Link href="/">{t("backHome")}</Link>
          </Button>
        }
      />
    </main>
  );
}
