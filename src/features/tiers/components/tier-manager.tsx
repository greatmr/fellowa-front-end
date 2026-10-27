'use client'

import { useState } from 'react'
import { Layers3, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { StudioPageHeader } from '@/components/layout/studio-page-header'
import { Button } from '@/components/ui/button'
import {
  useCreateTierMutation,
  useDeleteTierMutation,
  useTierRolesQuery,
  useTiersQuery,
  useUpdateTierMutation,
} from '@/features/tiers/api/tier-hooks'
import { TierCard } from '@/features/tiers/components/tier-card'
import { TierDeleteDialog } from '@/features/tiers/components/tier-delete-dialog'
import {
  TierFormSheet,
  type TierEditor,
} from '@/features/tiers/components/tier-form-sheet'
import {
  draftFromTier,
  emptyTierDraft,
  payloadFromDraft,
  type TierDraft,
} from '@/features/tiers/lib/tier-draft'
import type { Tier } from '@/features/tiers/types/tier'

export function TierManager({ viewerId }: { viewerId: number }) {
  const t = useTranslations('tiers')
  const tCommon = useTranslations('common')
  const tStudio = useTranslations('studio')
  const tiers = useTiersQuery(viewerId)
  const roles = useTierRolesQuery(viewerId)
  const create = useCreateTierMutation(viewerId)
  const update = useUpdateTierMutation(viewerId)
  const remove = useDeleteTierMutation(viewerId)
  const [editor, setEditor] = useState<TierEditor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Tier | null>(null)
  const [formError, setFormError] = useState(false)
  const pending = create.isPending || update.isPending

  function openEditor(tier?: Tier) {
    create.reset()
    update.reset()
    setFormError(false)
    setEditor({
      id: tier?.id,
      draft: tier ? draftFromTier(tier) : emptyTierDraft(),
    })
  }

  function setDraft(patch: Partial<TierDraft>) {
    setEditor((current) =>
      current ? { ...current, draft: { ...current.draft, ...patch } } : current
    )
    setFormError(false)
  }

  function submit() {
    if (!editor || pending) return
    const payload = payloadFromDraft(editor.draft)
    if (!payload) {
      setFormError(true)
      return
    }
    const onSuccess = () => setEditor(null)
    if (editor.id) update.mutate({ id: editor.id, ...payload }, { onSuccess })
    else create.mutate(payload, { onSuccess })
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <StudioPageHeader
          title={tStudio('pages.tiers.title')}
          category={tStudio('pages.tiers.category')}
        />
        <Button type="button" onClick={() => openEditor()}>
          <Plus aria-hidden />
          {t('create')}
        </Button>
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
        <EmptyState
          icon={<Layers3 />}
          title={t('emptyTitle')}
          description={t('emptyBody')}
          action={
            <Button type="button" onClick={() => openEditor()}>
              {t('create')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tiers.data.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              onEdit={openEditor}
              onDelete={(target) => {
                remove.reset()
                setDeleteTarget(target)
              }}
            />
          ))}
        </div>
      )}

      <TierFormSheet
        editor={editor}
        roles={roles}
        pending={pending}
        saveFailed={create.isError || update.isError}
        validationFailed={formError}
        onChange={setDraft}
        onSubmit={submit}
        onClose={() => setEditor(null)}
      />

      <TierDeleteDialog
        target={deleteTarget}
        pending={remove.isPending}
        failed={remove.isError}
        onConfirm={(target) =>
          remove.mutate(target.id, { onSuccess: () => setDeleteTarget(null) })
        }
        onClose={() => setDeleteTarget(null)}
      />
    </>
  )
}
