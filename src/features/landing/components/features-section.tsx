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
      className="relative scroll-mt-24 overflow-hidden py-14"
    >
      <WaveBackground />
      <div className="relative mx-auto max-w-public space-y-6 px-4 sm:px-6">
        {BLOCKS.map(({ key, visual }) => (
          <Reveal key={key}>
            <article className="rounded-card border bg-card/70 px-5 py-11 text-center shadow-soft backdrop-blur-xl sm:px-11 sm:py-14">
              <p className="mb-4 text-body-lg font-bold text-muted-foreground">
                {t(`${key}.eyebrow`)}
              </p>
              <h2 className="mx-auto mb-4 max-w-2xl text-display font-bold tracking-tight text-foreground sm:text-4xl sm:leading-snug">
                {t(`${key}.title`)}
              </h2>
              <p className="mx-auto mb-11 max-w-xl text-body-lg leading-8 text-muted-foreground">
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
