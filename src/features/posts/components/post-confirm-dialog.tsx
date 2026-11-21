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

type Props = {
  /** `posts.confirmDelete` or `posts.confirmUnpublish`. */
  kind: 'confirmDelete' | 'confirmUnpublish'
  open: boolean
  /** Kept while the dialog animates closed, so its text does not change. */
  title: string
  pending: boolean
  /** The server's refusal, already translated; `null` for none. */
  error: string | null
  onConfirm: () => void
  onClose: () => void
}

/** Confirms a row's delete or unpublish (FQ-30 (5): per-row actions only). */
export function PostConfirmDialog({
  kind,
  open,
  title,
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
          <DialogTitle dir="auto">{t('title', { title })}</DialogTitle>
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
            variant={kind === 'confirmDelete' ? 'destructive' : 'inverse'}
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
