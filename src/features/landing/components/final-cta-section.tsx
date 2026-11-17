import Image from 'next/image'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

import { landingImages } from './landing-images'
import { Reveal } from './reveal'

export function FinalCtaSection() {
  const t = useTranslations('landing.finalCta')
  const { src } = landingImages.cta

  return (
    <section
      aria-labelledby="landing-final-title"
      className="relative mt-22.5 flex min-h-140 items-center justify-center overflow-hidden px-4 py-20 sm:px-6"
    >
      <Image src={src} alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-ink-900/20" aria-hidden />
      <Reveal className="relative w-full max-w-md">
        <div className="rounded-card bg-card px-6.5 pt-10 pb-9 text-center shadow-panel sm:px-14 sm:pt-13 sm:pb-12">
          <span
            className="mx-auto mb-5.5 block size-11.5 rounded-xl bg-cover-mix shadow-brand"
            aria-hidden
          />
          <h2
            id="landing-final-title"
            className="mb-7.5 text-closing font-black text-foreground"
          >
            {t('title')}
          </h2>
          <Button
            asChild
            size="lg"
            variant="inverse"
            className="w-full max-w-xs rounded-full"
          >
            <Link href="/auth">{t('cta')}</Link>
          </Button>
          <p className="mt-5 text-body-sm text-muted-foreground">
            {t.rich('login', {
              link: (chunks) => (
                <Link
                  href="/auth"
                  className="rounded-sm font-bold text-foreground underline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </Reveal>
    </section>
  )
}
