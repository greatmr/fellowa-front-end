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
      className="relative flex min-h-140 items-center justify-center overflow-hidden px-4 py-20 sm:px-6"
    >
      <Image src={src} alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-ink-900/20" aria-hidden />
      <Reveal className="relative w-full max-w-md">
        <div className="rounded-card bg-card px-6 py-10 text-center shadow-panel sm:px-14 sm:py-13">
          <span
            className="mx-auto mb-5 block size-11.5 rounded-xl bg-cover-mix"
            aria-hidden
          />
          <h2
            id="landing-final-title"
            className="mb-7 text-title font-bold text-foreground sm:text-display"
          >
            {t('title')}
          </h2>
          <Button
            asChild
            size="lg"
            variant="inverse"
            className="w-full max-w-xs rounded-full"
          >
            <Link href="/auth/register">{t('cta')}</Link>
          </Button>
          <p className="mt-5 text-body-sm text-muted-foreground">
            {t.rich('login', {
              link: (chunks) => (
                <Link
                  href="/auth/login"
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
