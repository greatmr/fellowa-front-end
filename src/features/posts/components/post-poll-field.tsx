'use client'

import { useId } from 'react'
import { Plus, X } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  MIN_POLL_OPTIONS,
  type DraftPoll,
} from '@/features/posts/lib/post-draft'
import { MAX_POLL_OPTION } from '@/features/posts/schemas/post'

type Props = {
  poll: DraftPoll
  onChange: (poll: DraftPoll) => void
  /** The composer's "at least two options" check, on publish. */
  showRequired: boolean
}

/**
 * The poll block (`ComposerView.tsx` `insertPoll`: a titled box with two
 * option inputs). Options and the single/multiple choice go to `POST/PUT
 * /content/poll` (`options[{option≤160}]`, `typeSelect`); the API sets no
 * count, so the two the design starts with are what a publish needs ([PROP]).
 * Voting is the reader's (FE-CONT-01). A stored closing time is shown and
 * resent; the design has no control to set one.
 */
export function PostPollField({ poll, onChange, showRequired }: Props) {
  const t = useTranslations('posts.composer.poll')
  const format = useFormatter()
  const ids = useId()

  function setOption(index: number, value: string) {
    onChange({
      ...poll,
      options: poll.options.map((option, at) =>
        at === index ? value : option
      ),
    })
  }

  function removeOption(index: number) {
    onChange({
      ...poll,
      options: poll.options.filter((_, at) => at !== index),
    })
  }

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="grid gap-3 rounded-md border bg-muted/40 p-4"
    >
      <div>
        <h2
          id={`${ids}-title`}
          className="text-body font-semibold text-foreground"
        >
          {t('title')}
        </h2>
        <p className="mt-1 text-label text-muted-foreground">{t('hint')}</p>
      </div>
      <ol className="grid gap-2">
        {poll.options.map((option, index) => (
          // Options have no id until saved; their place is their identity.
          <li key={index} className="flex items-center gap-2">
            <label htmlFor={`${ids}-option-${index}`} className="sr-only">
              {t('optionLabel', { index: index + 1 })}
            </label>
            <Input
              id={`${ids}-option-${index}`}
              value={option}
              maxLength={MAX_POLL_OPTION}
              placeholder={t('optionPlaceholder', { index: index + 1 })}
              onChange={(event) => setOption(index, event.target.value)}
              className="bg-background"
            />
            {poll.options.length > MIN_POLL_OPTIONS ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={t('removeOption', { index: index + 1 })}
                title={t('removeOption', { index: index + 1 })}
                onClick={() => removeOption(index)}
              >
                <X aria-hidden />
              </Button>
            ) : null}
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => onChange({ ...poll, options: [...poll.options, ''] })}
      >
        <Plus aria-hidden />
        {t('addOption')}
      </Button>
      <div className="flex items-center justify-between gap-3 border-t pt-3">
        <label
          htmlFor={`${ids}-multi`}
          className="text-label font-medium text-foreground"
        >
          {t('multiSelect')}
        </label>
        <Switch
          id={`${ids}-multi`}
          checked={poll.multiSelect}
          onCheckedChange={(multiSelect) => onChange({ ...poll, multiSelect })}
        />
      </div>
      {poll.closesAt ? (
        <p className="text-caption text-muted-foreground">
          {t('closesAt', {
            date: format.dateTime(new Date(poll.closesAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
          })}
        </p>
      ) : null}
      <p className="text-caption text-muted-foreground">{t('lockedNote')}</p>
      {showRequired ? (
        <p role="alert" className="text-label text-destructive">
          {t('required', { count: MIN_POLL_OPTIONS })}
        </p>
      ) : null}
    </section>
  )
}
