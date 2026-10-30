import { CheckIcon, MinusIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Reveal } from './reveal'

const ROWS = [
  'page',
  'tier',
  'locked',
  'payment',
  'members',
  'contact',
  'revenue',
  'experience',
] as const

export function CompareSection() {
  const t = useTranslations('landing.compare')

  return (
    <section
      id="why"
      aria-labelledby="landing-compare-title"
      className="relative scroll-mt-24 overflow-hidden bg-brand-50 py-20 dark:bg-brand-900/15"
    >
      <div
        className="pointer-events-none absolute -start-40 top-0 size-120 rounded-full bg-violet-100 opacity-70 blur-3xl dark:bg-violet-900 dark:opacity-30"
        aria-hidden
      />
      <div className="relative mx-auto max-w-public px-4 sm:px-6">
        <Reveal>
          <h2
            id="landing-compare-title"
            className="mb-3.5 text-center text-display font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t('title')}
          </h2>
          <p className="mb-12 text-center text-body-lg leading-7 text-muted-foreground">
            {t('description')}
          </p>
        </Reveal>
        <Reveal className="delay-100">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-card border bg-card shadow-panel">
            <table className="w-full table-fixed border-collapse text-label wrap-anywhere sm:text-body">
              <caption className="sr-only">{t('title')}</caption>
              <thead>
                <tr className="border-b font-bold text-foreground">
                  <th scope="col" className="p-2 text-center sm:px-6 sm:py-4.5">
                    {t('featureHeader')}
                  </th>
                  <th scope="col" className="p-2 text-center sm:px-6 sm:py-4.5">
                    {t('currentHeader')}
                  </th>
                  <th
                    scope="col"
                    className="bg-primary/10 p-2 text-start text-link sm:px-6 sm:py-4.5"
                  >
                    {t('fellowaHeader')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row} className="border-b last:border-b-0">
                    <th
                      scope="row"
                      className="p-2 text-center font-bold text-foreground sm:px-6 sm:py-4"
                    >
                      {t(`${row}.feature`)}
                    </th>
                    <td className="p-2 text-center text-muted-foreground sm:px-6 sm:py-4">
                      <span className="inline-flex items-center gap-1.5">
                        <MinusIcon
                          className="size-3.5 shrink-0 text-destructive"
                          aria-hidden
                        />
                        {t(`${row}.current`)}
                      </span>
                    </td>
                    <td className="bg-primary/5 p-2 font-bold text-link sm:px-6 sm:py-4">
                      <span className="flex items-center gap-2">
                        <CheckIcon
                          className="size-4 shrink-0 rounded-full bg-money-500/15 p-0.5 text-money-600 dark:text-money-400"
                          aria-hidden
                        />
                        {t(`${row}.fellowa`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
