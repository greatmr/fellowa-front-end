'use client'

import { FileEdit, FolderPlus, Send, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import type { BulkAction } from '@/features/posts/api/post-hooks'
import type { BulkProgress } from '@/features/posts/lib/bulk'

export type BulkRun = BulkProgress & { action: BulkAction }

/** A finished run with failures: which posts, and why (already worded). */
export type BulkSummary = {
  action: BulkAction
  total: number
  failures: { id: number; title: string; reason: string }[]
}

type Props = {
  count: number
  /** Some selected post is a draft / is published. */
  canPublish: boolean
  canDraft: boolean
  run: BulkRun | null
  onAddToCollection: () => void
  onPublish: () => void
  onDraft: () => void
  onDelete: () => void
  onCancel: () => void
}

/**
 * The bulk bar (presentation `PostsView` :620-678 @ d843c3b): add to
 * collection, publish, draft, delete, clear. While a run is going it shows
 * its progress instead of the actions.
 */
export function BulkBar({
  count,
  canPublish,
  canDraft,
  run,
  onAddToCollection,
  onPublish,
  onDraft,
  onDelete,
  onCancel,
}: Props) {
  const t = useTranslations('posts.bulk')

  return (
    <div
      role="region"
      aria-label={t('barLabel')}
      className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border bg-muted/80 px-4 py-2.5 text-label"
    >
      <span className="font-semibold text-foreground">
        {t('selected', { count })}
      </span>
      {run ? (
        <p role="status" aria-live="polite" className="text-muted-foreground">
          {t(`running.${run.action}`, { done: run.done, total: run.total })}
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="inverse"
            size="sm"
            onClick={onAddToCollection}
          >
            <FolderPlus aria-hidden className="size-3.5" />
            {t('addToCollection')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canPublish}
            onClick={onPublish}
          >
            <Send aria-hidden className="size-3.5" />
            {t('publish')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canDraft}
            onClick={onDraft}
          >
            <FileEdit aria-hidden className="size-3.5" />
            {t('draft')}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 aria-hidden className="size-3.5" />
            {t('delete')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            {t('cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** What a run left behind when some posts failed; they stay selected. */
export function BulkSummaryNote({
  summary,
  onDismiss,
}: {
  summary: BulkSummary
  onDismiss: () => void
}) {
  const t = useTranslations('posts.bulk.summary')
  const failed = summary.failures.length

  return (
    <div
      role="alert"
      className="flex items-start justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-label"
    >
      <div className="grid gap-1.5">
        <p className="font-semibold text-foreground">
          {t('title', {
            done: summary.total - failed,
            total: summary.total,
            failed,
          })}
        </p>
        <ul className="grid gap-0.5 text-foreground">
          {summary.failures.map((failure) => (
            <li key={failure.id} dir="auto">
              {t('item', { title: failure.title, reason: failure.reason })}
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">{t('kept')}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t('dismiss')}
        title={t('dismiss')}
        onClick={onDismiss}
      >
        <X aria-hidden />
      </Button>
    </div>
  )
}
