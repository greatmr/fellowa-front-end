'use client'

import { CheckIcon, Link2Icon, PlusIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSaveSocialLinksMutation } from '@/features/onboarding/api/onboarding-hooks'
import { StepError } from '@/features/onboarding/components/step-error'
import {
  SOCIAL_PLATFORMS,
  displaySocialLink,
  socialUrlFromInput,
  type SocialPlatform,
} from '@/features/onboarding/schemas/onboarding'
import type {
  SocialField,
  SocialLinks,
} from '@/features/onboarding/types/onboarding'

function sameLinks(a: SocialLinks, b: SocialLinks) {
  return SOCIAL_PLATFORMS.every(({ field }) => a[field] === b[field])
}

/**
 * The socials step (CP-03). Finishing saves the links in one `PUT /user/about`;
 * skipping saves nothing. The prototype's "create page" wording is gone: the
 * page is created by publishing, from the studio checklist.
 */
export function SocialsStep({
  viewerId,
  initial,
  saved,
  savedAlias,
  onChanged,
  onFinished,
  onBack,
}: {
  viewerId: number
  /** The links to show: unsaved edits survive going back a step. */
  initial: SocialLinks
  /** The links the backend holds, which decide whether there is anything to save. */
  saved: SocialLinks
  /** The username just saved, as the backend stores it. */
  savedAlias: string | null
  onChanged: (links: SocialLinks) => void
  onFinished: () => void
  onBack: () => void
}) {
  const t = useTranslations('onboarding')
  const mutation = useSaveSocialLinksMutation(viewerId)
  const [links, setLinks] = useState(initial)
  const [openField, setOpenField] = useState<SocialField | null>(null)
  const [draft, setDraft] = useState('')
  const [draftInvalid, setDraftInvalid] = useState(false)

  function closeRow() {
    setOpenField(null)
    setDraft('')
    setDraftInvalid(false)
  }

  function changeLinks(next: SocialLinks) {
    setLinks(next)
    onChanged(next)
  }

  /** The links with the open row applied, or `null` if its text is not valid. */
  function linksWithDraft(platform: SocialPlatform): SocialLinks | null {
    const url = socialUrlFromInput(platform, draft)
    if (!url) {
      setDraftInvalid(true)
      return null
    }
    return { ...links, [platform.field]: url }
  }

  function saveRow(platform: SocialPlatform) {
    const next = linksWithDraft(platform)
    if (!next) return
    changeLinks(next)
    closeRow()
  }

  function finish() {
    // Text left in an open row is what the user meant to add, not to lose.
    const open = SOCIAL_PLATFORMS.find(({ field }) => field === openField)
    const next = open && draft.trim() ? linksWithDraft(open) : links
    if (!next) return
    changeLinks(next)
    closeRow()
    if (sameLinks(next, saved)) {
      onFinished()
      return
    }
    mutation.mutate(next, { onSuccess: onFinished })
  }

  const busy = mutation.isPending

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-title font-bold text-foreground">
          {t('socials.title')}
        </h1>
        <p className="text-body leading-7 text-muted-foreground">
          {t('socials.description')}
        </p>
      </div>
      {savedAlias ? (
        <p role="status" className="text-body-sm text-foreground">
          {t.rich('socials.usernameSaved', {
            alias: savedAlias,
            handle: (chunks) => (
              <bdi dir="ltr" className="font-semibold">
                {chunks}
              </bdi>
            ),
          })}
        </p>
      ) : null}
      {mutation.error ? <StepError error={mutation.error} /> : null}

      <ul className="grid gap-2" aria-busy={busy}>
        {SOCIAL_PLATFORMS.map((platform) => {
          const url = links[platform.field]
          const name = t(`socials.platforms.${platform.key}`)
          const isOpen = openField === platform.field
          const inputId = `social-${platform.key}`
          return (
            <li key={platform.field} className="rounded-md border bg-card p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Link2Icon aria-hidden className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-body font-semibold text-foreground">
                      {name}
                      {url ? (
                        <CheckIcon
                          aria-hidden
                          className="size-4 text-money-600"
                        />
                      ) : null}
                    </p>
                    {url ? (
                      <p className="truncate text-label text-muted-foreground">
                        <bdi dir="ltr">{displaySocialLink(url)}</bdi>
                      </p>
                    ) : null}
                  </div>
                </div>
                {url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={t('socials.removeLabel', { platform: name })}
                    onClick={() =>
                      changeLinks({ ...links, [platform.field]: null })
                    }
                  >
                    {t('socials.remove')}
                  </Button>
                ) : isOpen ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    aria-label={t('socials.addLabel', { platform: name })}
                    onClick={() => {
                      closeRow()
                      setOpenField(platform.field)
                    }}
                  >
                    <PlusIcon aria-hidden className="size-3.5" />
                    {t('socials.add')}
                  </Button>
                )}
              </div>
              {isOpen && !url ? (
                <div className="mt-3 grid gap-2 border-t pt-3">
                  <label htmlFor={inputId} className="sr-only">
                    {t('socials.inputLabel', { platform: name })}
                  </label>
                  <div dir="ltr" className="flex items-center gap-1.5">
                    <span className="shrink-0 text-label text-muted-foreground select-none">
                      {platform.prefix}
                    </span>
                    <Input
                      id={inputId}
                      dir="ltr"
                      value={draft}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={t('socials.placeholder')}
                      aria-invalid={draftInvalid}
                      aria-describedby={
                        draftInvalid ? `${inputId}-error` : undefined
                      }
                      onChange={(event) => {
                        setDraft(event.target.value)
                        setDraftInvalid(false)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          saveRow(platform)
                        }
                      }}
                    />
                  </div>
                  {draftInvalid ? (
                    <p
                      id={`${inputId}-error`}
                      className="text-sm text-destructive"
                    >
                      {t('socials.invalid')}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveRow(platform)}
                    >
                      {t('socials.saveRow', { platform: name })}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={closeRow}
                    >
                      {t('socials.cancelRow')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="grid gap-2">
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={finish}
        >
          {busy ? t('saving') : t('socials.finish')}
        </Button>
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onBack}
          >
            {t('back')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onFinished}
          >
            {t('socials.skip')}
          </Button>
        </div>
      </div>
    </div>
  )
}
