'use client'

import { useId } from 'react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import type { TierSelection } from '@/features/posts/lib/post-draft'
import { useTiersQuery, type Tier } from '@/features/tiers/client'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Props = {
  viewerId: number
  access: 'free' | 'tiers'
  tiers: TierSelection
  /** The edit started from a limited post, so "keep" can be offered again. */
  canKeep: boolean
  /** O-4, from the client check or the server's `CONTENT_TIER_REQUIRED`. */
  tiersError: string | null
  onAccessChange: (access: 'free' | 'tiers') => void
  onTiersChange: (tiers: TierSelection) => void
}

const optionClass =
  'flex cursor-pointer items-start gap-2.5 rounded-md border border-input p-3 transition-colors has-checked:border-primary has-checked:bg-primary/5'

/**
 * "Who can access this post?" (`ComposerView.tsx:400-476` @ d843c3b), as
 * FQ-30 (2): free, or specific tiers with a select-all shortcut. The
 * design's "all members" option is not offered: no route writes
 * `paid_members` (api.md → Mapping), and selecting every tier is the same
 * today but does not grow with new tiers, which the note says.
 */
export function PostAccessPanel({
  viewerId,
  access,
  tiers,
  canKeep,
  tiersError,
  onAccessChange,
  onTiersChange,
}: Props) {
  const t = useTranslations('posts.composer.access')
  const ids = useId()
  const errorId = `${ids}-tiers-error`

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 text-body font-semibold text-foreground">
        {t('title')}
      </legend>
      <label className={optionClass}>
        <input
          type="radio"
          name={`${ids}-access`}
          value="free"
          checked={access === 'free'}
          onChange={() => onAccessChange('free')}
          className="mt-0.5 accent-foreground"
        />
        <span className="text-label leading-5 text-foreground">
          <span className="block font-semibold">{t('free')}</span>
          <span className="text-muted-foreground">{t('freeHint')}</span>
        </span>
      </label>
      <label className={optionClass}>
        <input
          type="radio"
          name={`${ids}-access`}
          value="tiers"
          checked={access === 'tiers'}
          onChange={() => onAccessChange('tiers')}
          className="mt-0.5 accent-foreground"
        />
        <span className="text-label leading-5 text-foreground">
          <span className="block font-semibold">{t('tiers')}</span>
          <span className="text-muted-foreground">{t('tiersHint')}</span>
        </span>
      </label>
      {access === 'tiers' ? (
        <div
          className={cn(
            'grid gap-2.5 rounded-md border bg-muted/60 p-3',
            tiersError && 'border-destructive'
          )}
        >
          {tiers.mode === 'keep' ? (
            <>
              <p className="text-label font-semibold text-foreground">
                {t('keepTitle')}
              </p>
              <p className="text-label leading-5 text-muted-foreground">
                {t('keepBody')}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => onTiersChange({ mode: 'pick', ids: [] })}
              >
                {t('choose')}
              </Button>
            </>
          ) : (
            <TierPicker
              viewerId={viewerId}
              selected={tiers.ids}
              errorId={tiersError ? errorId : undefined}
              onChange={(next) => onTiersChange({ mode: 'pick', ids: next })}
            />
          )}
          {tiers.mode === 'pick' && canKeep ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="justify-self-start px-0"
              onClick={() => onTiersChange({ mode: 'keep' })}
            >
              {t('keep')}
            </Button>
          ) : null}
          {tiersError ? (
            <p
              id={errorId}
              role="alert"
              className="text-label text-destructive"
            >
              {tiersError}
            </p>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  )
}

function TierPicker({
  viewerId,
  selected,
  errorId,
  onChange,
}: {
  viewerId: number
  selected: number[]
  errorId: string | undefined
  onChange: (ids: number[]) => void
}) {
  const t = useTranslations('posts.composer.access')
  const tCommon = useTranslations('common')
  const query = useTiersQuery(viewerId)

  if (query.isPending) {
    return (
      <p role="status" className="text-label text-muted-foreground">
        {t('tiersLoading')}
      </p>
    )
  }
  if (query.isError) {
    return (
      <div className="grid justify-items-start gap-2">
        <p role="alert" className="text-label text-destructive">
          {t('tiersError')}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
        >
          {tCommon('retry')}
        </Button>
      </div>
    )
  }
  const tiers: Tier[] = query.data
  if (tiers.length === 0) {
    return (
      <div className="grid justify-items-start gap-2">
        <p className="text-label text-amber-700 dark:text-amber-300">
          {t('noTiers')}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/tiers">{t('createTier')}</Link>
        </Button>
      </div>
    )
  }
  const allSelected = tiers.every((tier) => selected.includes(tier.id))
  return (
    <>
      <ul className="grid gap-2" aria-describedby={errorId}>
        {tiers.map((tier) => {
          const checked = selected.includes(tier.id)
          return (
            <li key={tier.id}>
              <label className="flex cursor-pointer items-center gap-2.5 text-label text-foreground">
                <Checkbox
                  checked={checked}
                  aria-invalid={errorId ? true : undefined}
                  onCheckedChange={(value) =>
                    onChange(
                      value === true
                        ? [...selected, tier.id]
                        : selected.filter((id) => id !== tier.id)
                    )
                  }
                />
                <span dir="auto">{tier.title}</span>
              </label>
            </li>
          )
        })}
      </ul>
      {!allSelected ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange(tiers.map((tier) => tier.id))}
        >
          {t('selectAll')}
        </Button>
      ) : null}
      <p className="text-label leading-5 text-muted-foreground">
        {t('laterTiersNote')}
      </p>
    </>
  )
}
