import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import {
  ChatVisual,
  ContentVisual,
  SupportVisual,
  TiersVisual,
} from './feature-visuals'
import { Reveal } from './reveal'
import { WaveBackground } from './wave-background'

const BLOCKS: {
  key: 'support' | 'tiers' | 'content' | 'chat'
  visual: ReactNode
}[] = [
  { key: 'support', visual: <SupportVisual /> },
  { key: 'tiers', visual: <TiersVisual /> },
  { key: 'content', visual: <ContentVisual /> },
  { key: 'chat', visual: <ChatVisual /> },
]

export function FeaturesSection() {
  const t = useTranslations('landing.features')

  return (
    <section
      id="features"
      className="relative scroll-mt-24 overflow-hidden pt-14 pb-7.5"
    >
      <WaveBackground />
      <div className="relative mx-auto max-w-public space-y-6.5 px-4 sm:px-6">
        {BLOCKS.map(({ key, visual }) => (
          <Reveal key={key}>
            {/* Blue-tinted glass over the wave (presentation `.fw-block`). */}
            <article className="overflow-hidden rounded-4xl border border-white/70 bg-brand-50/45 px-5 pt-11 pb-10 text-center shadow-block backdrop-blur-xl backdrop-saturate-120 sm:rounded-section sm:px-11 sm:pt-15 sm:pb-14 dark:border-border dark:bg-card/60 dark:shadow-soft">
              <p className="mb-4 text-body-lg font-bold text-muted-foreground">
                {t(`${key}.eyebrow`)}
              </p>
              <h2 className="mx-auto mb-4 max-w-170 text-section font-black text-foreground">
                {t(`${key}.title`)}
              </h2>
              <p className="mx-auto mb-11 max-w-145 text-body-lg leading-8 text-muted-foreground">
                {t(`${key}.text`)}
              </p>
              {visual}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
