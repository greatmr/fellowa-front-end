'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { Money } from '@/components/common/money'
import { useExploreCategoriesQuery } from '@/features/explore'
import { cn } from '@/lib/utils'

import { useAuthFlow } from './auth-flow-context'

/**
 * Illustrative creators: static copy and sample prices, never real accounts.
 * Each takes a category from the list the interests step loaded — the API
 * sends `{id, title}` only (no slug to pair a sample with a category), so the
 * ids and titles stay the API's own.
 * The prototype's six, in its order and prices; its two samples named after a
 * topic (a podcast, a gamer) are people here, since the topic is not fixed.
 */
const SAMPLES = [
  { key: 'sara', amountToman: 140_000, avatar: 'bg-cover-violet' },
  { key: 'negar', amountToman: 90_000, avatar: 'bg-cover-brand' },
  { key: 'arman', amountToman: 120_000, avatar: 'bg-cover-mix' },
  { key: 'amirhossein', amountToman: 85_000, avatar: 'bg-cover-brand' },
  { key: 'reza', amountToman: 110_000, avatar: 'bg-cover-violet' },
  { key: 'mahsa', amountToman: 75_000, avatar: 'bg-cover-mix' },
] as const

/**
 * The interests step's visual column (presentation `AuthLayout` [C2] @
 * 01fb04d): sample creator cards that move the ones in the ticked categories
 * to the front and dim the rest, previewing how Explore would re-order. It
 * reads the category list the step loaded and never asks for it itself;
 * until there is one, the frame's usual samples stay. Not ported: the
 * avatar photos (Unsplash); each avatar is a brand gradient.
 */
export function InterestsPreview({ fallback }: { fallback: ReactNode }) {
  const t = useTranslations('auth.interests.preview')
  const { pickedCategoryIds } = useAuthFlow()
  const { data: categories } = useExploreCategoriesQuery({ enabled: false })
  if (!categories?.length) return fallback

  const isMatch = (categoryId: number) => pickedCategoryIds.includes(categoryId)
  // There are more categories than cards: the picked ones get a card first,
  // then the rest fill up. Paired in list order, so a card keeps its category
  // while the picks leave room for it.
  const shown = new Set(
    [
      ...categories.filter((category) => isMatch(category.id)),
      ...categories.filter((category) => !isMatch(category.id)),
    ]
      .slice(0, SAMPLES.length)
      .map((category) => category.id)
  )
  const cards = categories
    .filter((category) => shown.has(category.id))
    .map((category, index) => ({ ...SAMPLES[index], category }))
  const hasPicks = pickedCategoryIds.length > 0
  // Array sort is stable: matches first, each group in list order.
  const ordered = hasPicks
    ? [...cards].sort(
        (a, b) =>
          Number(isMatch(b.category.id)) - Number(isMatch(a.category.id))
      )
    : cards

  return (
    <div className="w-full max-w-105 space-y-3">
      <div className="mb-2 text-center">
        <span className="rounded-full bg-white/10 px-3.5 py-1 text-label font-semibold text-white/90 backdrop-blur-md">
          {t('badge')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {ordered.map(({ key, amountToman, avatar, category }) => {
          const match = hasPicks && isMatch(category.id)
          const dimmed = hasPicks && !match
          return (
            <div
              key={key}
              data-match={match || undefined}
              className={cn(
                'relative overflow-hidden rounded-card border bg-white/10 p-3.5 shadow-lg backdrop-blur-xl transition-all duration-500 motion-reduce:transition-none',
                match
                  ? 'scale-102 border-brand-600 bg-white/20 shadow-brand'
                  : dimmed
                    ? 'scale-95 border-white/10 opacity-40'
                    : 'border-white/15 opacity-85'
              )}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <span
                  className={cn(
                    'size-9 shrink-0 rounded-full border border-white/30',
                    avatar
                  )}
                />
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-bold text-white">
                    {t(`creators.${key}`)}
                  </p>
                  <span
                    className={cn(
                      'mt-0.5 inline-block rounded-full px-2 py-0.5 text-micro font-medium',
                      match
                        ? 'bg-brand-600 text-white'
                        : 'bg-white/15 text-white/80'
                    )}
                  >
                    {category.title}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-1 text-caption text-white/70">
                <span>{t('monthly')}</span>
                <span className="font-semibold text-white">
                  <Money amountToman={amountToman} />
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
