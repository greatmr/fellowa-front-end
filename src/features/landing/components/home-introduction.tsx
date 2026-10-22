import {
  ArrowUpRightIcon,
  FileTextIcon,
  HeartIcon,
  SparklesIcon,
  UsersIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/** Static introduction for the public frame; the full FE-LAND-01 page remains a separate port. */
export function HomeIntroduction() {
  const t = useTranslations('home')
  const features = [
    { title: 'pageTitle', body: 'pageBody', icon: SparklesIcon },
    { title: 'membershipTitle', body: 'membershipBody', icon: UsersIcon },
    { title: 'contentTitle', body: 'contentBody', icon: FileTextIcon },
  ] as const

  return (
    <>
      <section className="relative overflow-hidden border-b bg-brand-50/60 dark:bg-brand-900/15">
        <div
          className="pointer-events-none absolute end-0 -top-32 size-96 rounded-full bg-cover-mix opacity-10 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-public px-4 py-20 sm:px-6 sm:py-28 lg:py-32">
          <div className="max-w-3xl space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-4 py-2 text-label font-semibold text-link">
              <SparklesIcon className="size-4" aria-hidden />
              {t('eyebrow')}
            </p>
            <h1 className="text-display font-extrabold tracking-tight sm:text-5xl sm:leading-tight">
              {t('title')}
            </h1>
            <p className="max-w-2xl text-subtitle leading-8 text-muted-foreground sm:text-title-sm sm:leading-9">
              {t('description')}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild size="lg" className="rounded-full shadow-brand">
                <Link href="/studio">
                  {t('studioCta')}
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
                <a href="#why">{t('learnMore')}</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="why"
        className="mx-auto grid max-w-public scroll-mt-24 gap-8 px-4 py-16 sm:px-6 sm:py-24 md:grid-cols-2 md:items-center md:gap-16"
        aria-labelledby="why-title"
      >
        <div className="space-y-5">
          <h2
            id="why-title"
            className="text-headline font-bold sm:text-display"
          >
            {t('whyTitle')}
          </h2>
          <p className="text-body-lg leading-8 text-muted-foreground">
            {t('whyBody')}
          </p>
        </div>
        <div className="flex flex-col items-start gap-5 rounded-card border bg-card p-8 shadow-soft sm:p-10">
          <span className="flex size-14 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
            <HeartIcon className="size-7" strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-title leading-9 font-semibold">{t('whyNote')}</p>
        </div>
      </section>

      <section
        id="features"
        className="scroll-mt-24 border-y bg-muted/40"
        aria-labelledby="features-title"
      >
        <div className="mx-auto max-w-public space-y-10 px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl space-y-4">
            <h2
              id="features-title"
              className="text-headline font-bold sm:text-display"
            >
              {t('featuresTitle')}
            </h2>
            <p className="text-body-lg leading-8 text-muted-foreground">
              {t('featuresBody')}
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ title, body, icon: Icon }) => (
              <article
                key={title}
                className="space-y-5 rounded-card border bg-card p-6 shadow-soft sm:p-8"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-link dark:bg-brand-500/15">
                  <Icon className="size-6" strokeWidth={1.6} aria-hidden />
                </span>
                <h3 className="text-title-sm font-bold">{t(title)}</h3>
                <p className="text-body leading-7 text-muted-foreground">
                  {t(body)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-public flex-col items-start justify-between gap-6 px-4 py-16 sm:px-6 sm:py-20 md:flex-row md:items-center">
        <div className="space-y-3">
          <h2 className="text-headline font-bold">{t('closingTitle')}</h2>
          <p className="text-body-lg text-muted-foreground">
            {t('closingBody')}
          </p>
        </div>
        <Button asChild size="lg" className="rounded-full">
          <Link href="/studio">
            {t('studioCta')}
            <ArrowUpRightIcon className="size-5 rtl:-rotate-90" aria-hidden />
          </Link>
        </Button>
      </section>
    </>
  )
}
