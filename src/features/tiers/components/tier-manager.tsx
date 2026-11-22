'use client'

import { useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  useDeleteTierMutation,
  useTierRolesQuery,
  useTiersQuery,
} from '@/features/tiers/api/tier-hooks'
import { TierBuilder } from '@/features/tiers/components/tier-builder'
import { TierCard } from '@/features/tiers/components/tier-card'
import { TierDeleteDialog } from '@/features/tiers/components/tier-delete-dialog'
import { TierEmptyState } from '@/features/tiers/components/tier-empty-state'
import {
  TierGuideDialog,
  type GuideResult,
} from '@/features/tiers/components/tier-guide-dialog'
import {
  draftFromTier,
  emptyTierDraft,
  type TierDraft,
} from '@/features/tiers/lib/tier-draft'
import type { Tier } from '@/features/tiers/types/tier'

type Builder = { key: number; saved: Tier | null; draft: TierDraft }

/**
 * The tiers studio page (presentation `TiersView` @ d843c3b): the list or its
 * empty state, the full-page builder in place of the list while open, the
 * setup guide and the delete dialog.
 */
export function TierManager({ viewerId }: { viewerId: number }) {
  const t = useTranslations('tiers')
  const tCommon = useTranslations('common')
  const tPanel = useTranslations('studio')
  const tiers = useTiersQuery(viewerId)
  const roles = useTierRolesQuery(viewerId)
  const remove = useDeleteTierMutation(viewerId)
  const [builder, setBuilder] = useState<Builder | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null)
  // Remounts the builder and the guide so each opening starts fresh.
  const [openings, setOpenings] = useState(0)

  function openBuilder(saved: Tier | null, draft: TierDraft) {
    setOpenings((count) => count + 1)
    setBuilder({ key: openings + 1, saved, draft })
  }

  function openGuide() {
    setOpenings((count) => count + 1)
    setGuideOpen(true)
  }

  function finishGuide(result: GuideResult) {
    setGuideOpen(false)
    openBuilder(null, {
      ...emptyTierDraft(),
      title: result.title,
      description: result.description,
      price: String(result.price),
      benefits: result.benefits.map((benefit, index) => ({
        key: `guide-${index}`,
        ...benefit,
      })),
    })
  }

  function confirmDelete() {
    if (!deleteTarget) return
    const title = deleteTarget.title
    remove.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null)
        setBuilder(null)
        toast.success(t('deletedToast', { title }))
      },
    })
  }

  const deleteDialog = (
    <TierDeleteDialog
      title={deleteTarget?.title ?? null}
      pending={remove.isPending}
      failed={remove.isError}
      onConfirm={confirmDelete}
      onClose={() => setDeleteTarget(null)}
    />
  )

  if (builder) {
    return (
      <>
        <TierBuilder
          key={builder.key}
          viewerId={viewerId}
          saved={builder.saved}
          initialDraft={builder.draft}
          roles={roles}
          onClose={() => setBuilder(null)}
          onDelete={(tier) => {
            remove.reset()
            setDeleteTarget(tier)
          }}
        />
        {deleteDialog}
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div
        data-testid="tiers-list-header"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <PageHeader
          title={tPanel('pages.tiers.title')}
          category={tPanel('pages.tiers.category')}
          description={t('overviewHint')}
          className="mb-0"
        />
        <div className="flex items-center gap-2.5">
          {/* Same height as the create button: a deliberate deviation from
              the design's sm (36px) beside default (40px), FE-TIER-05. */}
          <Button type="button" variant="outline" onClick={openGuide}>
            <Sparkles aria-hidden />
            {t('openGuide')}
          </Button>
          <Button
            type="button"
            onClick={() => openBuilder(null, emptyTierDraft())}
          >
            <Plus aria-hidden strokeWidth={2.5} />
            {t('create')}
          </Button>
        </div>
      </div>

      {tiers.isPending ? (
        <p role="status" className="py-12 text-center text-muted-foreground">
          {tCommon('loading')}
        </p>
      ) : tiers.isError ? (
        <ErrorState
          title={t('loadError')}
          action={
            <Button type="button" onClick={() => void tiers.refetch()}>
              {tCommon('retry')}
            </Button>
          }
        />
      ) : tiers.data.length === 0 ? (
        <TierEmptyState
          onStartGuide={openGuide}
          onCreate={() => openBuilder(null, emptyTierDraft())}
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.data.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              onEdit={(target) => openBuilder(target, draftFromTier(target))}
            />
          ))}
        </div>
      )}

      <p className="rounded-md border bg-muted/60 p-4 text-label leading-6 text-muted-foreground">
        <strong className="font-semibold text-foreground">
          {t('priceNote.label')}
        </strong>{' '}
        {t('priceNote.body')}
      </p>

      <TierGuideDialog
        key={openings}
        open={guideOpen}
        roles={roles}
        onFinish={finishGuide}
        onClose={() => setGuideOpen(false)}
      />
      {deleteDialog}
    </div>
  )
}
