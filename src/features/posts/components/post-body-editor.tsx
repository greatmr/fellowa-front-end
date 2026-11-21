'use client'

import { useId, useRef } from 'react'
import { Lock, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { splitAtCaret, type BodyParts } from '@/features/posts/lib/paywall'

type Props = {
  before: string
  /** `null`: no divider. */
  after: string | null
  isPublic: boolean
  onChange: (parts: { before: string; after: string | null }) => void
}

const fieldClass =
  'min-h-40 resize-y border-0 px-0 text-body leading-8 shadow-none focus-visible:ring-0 md:text-body'

/**
 * Plain-text body with the paywall divider (FQ-30 (1); presentation
 * `ComposerView.tsx:276-398` @ d843c3b). The divider control splits the text
 * at the caret into two fields; removing it joins them again. No formatting
 * toolbar: the body is stored and cut as plain text.
 */
export function PostBodyEditor({ before, after, isPublic, onChange }: Props) {
  const t = useTranslations('posts.composer')
  const ids = useId()
  const beforeRef = useRef<HTMLTextAreaElement>(null)
  const afterRef = useRef<HTMLTextAreaElement>(null)

  function insertDivider() {
    const field = beforeRef.current
    const parts: BodyParts = splitAtCaret(
      before,
      field ? field.selectionStart : before.length
    )
    onChange(parts)
    // Continue writing where the gated part starts.
    requestAnimationFrame(() => {
      afterRef.current?.focus()
      afterRef.current?.setSelectionRange(0, 0)
    })
  }

  function removeDivider() {
    const joinAt = before.length
    onChange({ before: before + (after ?? ''), after: null })
    requestAnimationFrame(() => {
      beforeRef.current?.focus()
      beforeRef.current?.setSelectionRange(joinAt, joinAt)
    })
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2 border-y py-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200"
          disabled={after !== null}
          aria-describedby={`${ids}-divider-hint`}
          onClick={insertDivider}
        >
          <Lock aria-hidden strokeWidth={2} />
          {t('insertDivider')}
        </Button>
        <span
          id={`${ids}-divider-hint`}
          className="text-caption text-muted-foreground"
        >
          {after === null ? t('insertDividerHint') : null}
        </span>
      </div>
      <label htmlFor={`${ids}-before`} className="sr-only">
        {t('bodyLabel')}
      </label>
      <Textarea
        id={`${ids}-before`}
        ref={beforeRef}
        dir="auto"
        value={before}
        placeholder={t('bodyPlaceholder')}
        onChange={(event) => onChange({ before: event.target.value, after })}
        className={fieldClass}
      />
      {after !== null ? (
        <>
          <div
            role="separator"
            aria-label={t('dividerLabel')}
            className="flex items-center gap-3 py-1"
          >
            <span
              aria-hidden
              className="h-px flex-1 border-t border-dashed border-violet-300 dark:border-violet-500/40"
            />
            <span className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 px-2.5 py-1 text-label font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
              <Lock aria-hidden className="size-3.5" />
              {t('dividerLabel')}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t('removeDivider')}
              title={t('removeDivider')}
              onClick={removeDivider}
            >
              <X aria-hidden />
            </Button>
            <span
              aria-hidden
              className="h-px flex-1 border-t border-dashed border-violet-300 dark:border-violet-500/40"
            />
          </div>
          <p className="text-caption text-muted-foreground">
            {isPublic ? t('dividerFreePublic') : t('dividerFree')}
          </p>
          <label htmlFor={`${ids}-after`} className="sr-only">
            {t('afterLabel')}
          </label>
          <Textarea
            id={`${ids}-after`}
            ref={afterRef}
            dir="auto"
            value={after}
            placeholder={t('afterPlaceholder')}
            onChange={(event) =>
              onChange({ before, after: event.target.value })
            }
            className={fieldClass}
          />
        </>
      ) : null}
      <p className="text-caption text-muted-foreground">{t('plainTextNote')}</p>
    </div>
  )
}
