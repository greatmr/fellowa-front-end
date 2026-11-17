import { CheckIcon } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { AvatarStack } from './avatar-stack'
import { landingImages } from './landing-images'
import { SamplePreview } from './sample-preview'

function HeroCard({
  image,
  tag,
  price,
  benefits,
  className,
}: {
  image: (typeof landingImages)[keyof typeof landingImages]
  tag: string
  price: string
  benefits: string[]
  className: string
}) {
  const t = useTranslations('landing.sample')

  return (
    <div
      className={cn(
        'absolute w-64 overflow-hidden rounded-card bg-card shadow-panel sm:w-80',
        className
      )}
    >
      <div className="relative h-36 sm:h-46">
        <Image
          {...image}
          alt=""
          sizes="20rem"
          className="size-full object-cover"
        />
        <span className="absolute start-3.5 bottom-3 rounded-full bg-ink-900/55 px-3 py-1 text-caption font-semibold text-white backdrop-blur-sm">
          {tag}
        </span>
      </div>
      <div className="p-5">
        <p className="mb-4 flex items-baseline gap-2">
          <span className="text-title font-black tracking-tight text-foreground">
            {price}
          </span>
          <span className="text-body-sm text-muted-foreground">
            {t('perMonth')}
          </span>
        </p>
        <ul className="space-y-2.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <CheckIcon
                className="mt-0.5 size-4 shrink-0 rounded-full bg-money-500/15 p-0.5 text-money-600 dark:text-money-400"
                aria-hidden
              />
              <span className="text-label text-muted-foreground">
                {benefit}
              </span>
            </li>
          ))}
        </ul>
        <Button asChild variant="inverse" className="mt-5 w-full rounded-full">
          <Link href="/creators">{t('join')}</Link>
        </Button>
      </div>
    </div>
  )
}

export function HeroSection() {
  const t = useTranslations('landing.hero')

  return (
    <section className="relative overflow-hidden">
      {/*
       * Fluted glass over slowly drifting colour fields (presentation
       * `.fw-bg`): the fields, a frosted pane, the ribs, their lit edges and a
       * faint grain. The white ribs are dimmed in dark mode.
       */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute start-1/2 -bottom-50 h-160 w-220 -translate-x-1/2 rounded-full bg-brand-200 opacity-90 blur-3xl motion-safe:animate-drift-1 rtl:translate-x-1/2 dark:bg-brand-900 dark:opacity-60" />
        <div className="absolute -end-30 -top-40 h-118 w-135 rounded-full bg-violet-100 opacity-70 blur-3xl motion-safe:animate-drift-2 dark:bg-violet-900 dark:opacity-40" />
        <div className="absolute -start-35 top-1/6 h-102 w-115 rounded-full bg-amber-100 opacity-50 blur-3xl motion-safe:animate-drift-3 dark:hidden" />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-lg backdrop-saturate-110 dark:bg-transparent" />
        <div className="absolute inset-0 bg-flutes dark:opacity-10" />
        <div className="absolute inset-0 bg-flute-edges dark:opacity-10" />
        <div className="absolute inset-0 bg-grain opacity-2" />
      </div>

      <div className="relative mx-auto grid max-w-public items-center gap-11 px-4 pt-8 pb-24 sm:px-6 lg:grid-cols-2 lg:pt-12">
        <div>
          <p className="mb-6.5 inline-flex items-center gap-2 rounded-full border border-white/85 bg-card/55 px-4 py-2 text-label font-semibold text-link shadow-soft backdrop-blur-lg dark:border-border">
            <span className="size-2 shrink-0 rounded-full bg-cover-mix" />
            {t('eyebrow')}
          </p>
          <h1 className="mb-5 text-hero font-black text-foreground">
            {t.rich('title', {
              br: () => <br />,
              highlight: (chunks) => (
                <span className="bg-cover-mix bg-clip-text text-transparent dark:bg-none dark:text-link">
                  {chunks}
                </span>
              ),
            })}
          </h1>
          <p className="mb-8 max-w-115 text-subtitle leading-8 text-muted-foreground">
            {t('description')}
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-full shadow-brand hover:shadow-brand"
          >
            <Link href="/auth">{t('cta')}</Link>
          </Button>
        </div>

        <SamplePreview>
          <div className="relative h-125 lg:h-135">
            <HeroCard
              image={landingImages.stage}
              tag={t('music.tag')}
              price={t('music.price')}
              benefits={[t('music.benefit1'), t('music.benefit2')]}
              className="start-1 top-6.5 rotate-5 opacity-95"
            />
            <HeroCard
              image={landingImages.brushes}
              tag={t('designer.tag')}
              price={t('designer.price')}
              benefits={[
                t('designer.benefit1'),
                t('designer.benefit2'),
                t('designer.benefit3'),
              ]}
              className="end-5 top-23 z-10 -rotate-3"
            />
            <p
              aria-hidden
              className="absolute start-7 bottom-7.5 z-20 flex items-center gap-2.5 rounded-2xl border border-white/90 bg-card/65 px-4 py-2.5 shadow-panel backdrop-blur-lg motion-safe:animate-float-1 dark:border-border"
            >
              <AvatarStack
                images={[
                  landingImages.avatar2,
                  landingImages.avatar,
                  landingImages.avatar1,
                ]}
                className="size-6.5"
              />
              <span className="text-label font-bold text-foreground">
                {t('supporters')}
              </span>
            </p>
          </div>
        </SamplePreview>
      </div>
    </section>
  )
}
