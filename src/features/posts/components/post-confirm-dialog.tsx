'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type ConfirmKind =
  | 'confirmDelete'
  | 'confirmUnpublish'
  | 'bulk.confirmDelete'
  | 'bulk.confirmUnpublish'
  | 'collections.confirmDelete'

type Props = {
  /** The `posts.*` namespace with `title`, `body`, `confirm`, `pending`. */
  kind: ConfirmKind
  open: boolean
  /**
   * The heading's values: a post's or collection's `title`, or the bulk
   * `count`. Kept while the dialog animates closed, so its text does not
   * change.
   */
  values: { title?: string; count?: number }
  pending: boolean
  /** The server's refusal, already translated; `null` for none. */
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

/**
 * Confirms a destructive step: a row's or the selection's delete or
 * unpublish (FQ-30 (5)), or a collection's delete.
 */
export function PostConfirmDialog({
  kind,
  open,
  values,
  pending,
  error,
  onConfirm,
  onClose,
}: Props) {
  const t = useTranslations(`posts.${kind}`)
  const tCommon = useTranslations('common')

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent closeLabel={tCommon('close')}>
        <DialogHeader>
          <DialogTitle dir="auto">
            {t('title', {
              title: values.title ?? '',
              count: values.count ?? 0,
            })}
          </DialogTitle>
          <DialogDescription className="leading-6">
            {t('body')}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p role="alert" className="text-body-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={onClose}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            variant={kind.endsWith('confirmDelete') ? 'destructive' : 'inverse'}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? t('pending') : t('confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
