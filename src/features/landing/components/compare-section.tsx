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
      className="relative scroll-mt-24 overflow-hidden pt-20 pb-22.5"
    >
      {/* Three soft colour fields (presentation `.fw-compare-wrap`). */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -start-40 -top-60 h-125 w-225 rounded-full bg-brand-100 opacity-80 blur-3xl dark:bg-brand-900 dark:opacity-30" />
        <div className="absolute -end-60 top-1/6 h-130 w-200 rounded-full bg-brand-200 opacity-60 blur-3xl dark:bg-brand-800 dark:opacity-25" />
        <div className="absolute start-1/6 -bottom-60 h-115 w-175 rounded-full bg-violet-100 opacity-80 blur-3xl dark:bg-violet-900 dark:opacity-30" />
      </div>
      <div className="relative mx-auto max-w-public px-4 sm:px-6">
        <Reveal>
          <h2
            id="landing-compare-title"
            className="mb-3.5 text-center text-section font-black text-foreground"
          >
            {t('title')}
          </h2>
          <p className="mb-13 text-center text-body-lg leading-7 text-muted-foreground">
            {t('description')}
          </p>
        </Reveal>
        <Reveal className="delay-100">
          {/*
           * Column order as designed: Fellowa first (the start side), the
           * feature name last. Widths 1.2 : 1.15 : 1. The row header ends
           * the row, so each cell names its headers explicitly; the header
           * algorithm only looks back toward the row's start.
           */}
          <div className="mx-auto max-w-235 overflow-hidden rounded-card border bg-card shadow-panel">
            <table className="w-full table-fixed border-collapse text-label wrap-anywhere sm:text-body">
              <caption className="sr-only">{t('title')}</caption>
              <colgroup>
                <col className="w-9/25" />
                <col className="w-17/50" />
                <col className="w-3/10" />
              </colgroup>
              <thead>
                <tr className="border-b font-bold text-foreground">
                  <th
                    id="compare-col-fellowa"
                    scope="col"
                    className="bg-primary/10 px-2.5 py-3.5 text-start text-link sm:px-6 sm:py-4.75"
                  >
                    {t('fellowaHeader')}
                  </th>
                  <th
                    id="compare-col-current"
                    scope="col"
                    className="px-2.5 py-3.5 text-center sm:px-6 sm:py-4.75"
                  >
                    {t('currentHeader')}
                  </th>
                  <th
                    id="compare-col-feature"
                    scope="col"
                    className="px-2.5 py-3.5 text-center sm:px-6 sm:py-4.75"
                  >
                    {t('featureHeader')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row} className="border-b last:border-b-0">
                    <td
                      headers={`compare-col-fellowa compare-${row}`}
                      className="bg-primary/5 px-2.5 py-3.25 font-bold text-link sm:px-6 sm:py-4.25"
                    >
                      <span className="flex items-center gap-2">
                        <CheckIcon
                          className="size-4 shrink-0 rounded-full bg-money-500/15 p-0.5 text-money-600 dark:text-money-400"
                          aria-hidden
                        />
                        {t(`${row}.fellowa`)}
                      </span>
                    </td>
                    <td
                      headers={`compare-col-current compare-${row}`}
                      className="px-2.5 py-3.25 text-center text-muted-foreground sm:px-6 sm:py-4.25"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <MinusIcon
                          className="size-3.5 shrink-0 text-destructive"
                          aria-hidden
                        />
                        {t(`${row}.current`)}
                      </span>
                    </td>
                    <th
                      id={`compare-${row}`}
                      headers="compare-col-feature"
                      scope="row"
                      className="px-2.5 py-3.25 text-center font-bold text-foreground sm:px-6 sm:py-4.25"
                    >
                      {t(`${row}.feature`)}
                    </th>
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
