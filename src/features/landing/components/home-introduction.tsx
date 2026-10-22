import {
  ArrowUpRightIcon,
  FileTextIcon,
  HeartIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/** Static introduction for the public frame; the full FE-LAND-01 page remains a separate port. */
export function HomeIntroduction() {
  const t = useTranslations("home");
  const features = [
    { title: "pageTitle", body: "pageBody", icon: SparklesIcon },
    { title: "membershipTitle", body: "membershipBody", icon: UsersIcon },
    { title: "contentTitle", body: "contentBody", icon: FileTextIcon },
  ] as const;

  return (
    <>
      <section className="bg-brand-50/60 dark:bg-brand-900/15 relative overflow-hidden border-b">
        <div
          className="bg-cover-mix pointer-events-none absolute end-0 -top-32 size-96 rounded-full opacity-10 blur-3xl"
          aria-hidden
        />
        <div className="max-w-public relative mx-auto px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="max-w-3xl space-y-7">
            <p className="text-link bg-card/80 text-label inline-flex items-center gap-2 rounded-full border px-4 py-2 font-semibold">
              <SparklesIcon className="size-4" aria-hidden />
              {t("eyebrow")}
            </p>
            <h1 className="text-display font-extrabold tracking-tight sm:text-5xl sm:leading-tight">
              {t("title")}
            </h1>
            <p className="text-muted-foreground text-subtitle sm:text-title-sm max-w-2xl leading-8 sm:leading-9">
              {t("description")}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="shadow-brand rounded-full">
                <Link href="/studio">
                  {t("studioCta")}
                  <ArrowUpRightIcon
                    className="size-5 rtl:-rotate-90"
                    aria-hidden
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full"
              >
                <a href="#why">{t("learnMore")}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="why"
        className="max-w-public mx-auto grid scroll-mt-24 gap-8 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:items-center md:gap-16"
        aria-labelledby="why-title"
      >
        <div className="space-y-5">
          <h2
            id="why-title"
            className="text-headline sm:text-display font-bold"
          >
            {t("whyTitle")}
          </h2>
          <p className="text-muted-foreground text-body-lg leading-8">
            {t("whyBody")}
          </p>
        </div>
        <div className="bg-card rounded-card shadow-soft flex flex-col items-start gap-5 border p-8 sm:p-10">
          <span className="flex size-14 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <HeartIcon className="size-7" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-title leading-9 font-semibold">{t("whyNote")}</p>
        </div>
      </section>

      <section
        id="features"
        className="bg-muted/40 scroll-mt-24 border-y"
        aria-labelledby="features-title"
      >
        <div className="max-w-public mx-auto space-y-10 px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl space-y-4">
            <h2
              id="features-title"
              className="text-headline sm:text-display font-bold"
            >
              {t("featuresTitle")}
            </h2>
            <p className="text-muted-foreground text-body-lg leading-8">
              {t("featuresBody")}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ title, body, icon: Icon }) => (
              <article
                key={title}
                className="bg-card rounded-card shadow-soft space-y-5 border p-6 sm:p-8"
              >
                <span className="bg-brand-50 text-link dark:bg-brand-500/15 flex size-12 items-center justify-center rounded-xl">
                  <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                </span>
                <h3 className="text-title-sm font-bold">{t(title)}</h3>
                <p className="text-muted-foreground text-body leading-7">
                  {t(body)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-public mx-auto flex flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-center">
        <div className="space-y-3">
          <h2 className="text-headline font-bold">{t("closingTitle")}</h2>
          <p className="text-muted-foreground text-body-lg">
            {t("closingBody")}
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/studio">
            {t("studioCta")}
            <ArrowUpRightIcon className="size-5 rtl:-rotate-90" aria-hidden />
          </Link>
        </Button>
      </section>
    </>
  );
}
