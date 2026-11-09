'use client'

import { LoaderCircleIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormStatus } from 'react-dom'

import { startGoogleSignInAction } from '@/features/auth/server/google-actions'

/**
 * The entry screen's first and largest action (presentation
 * `LoginOrSignupScreen` @ fdb5f6c): a form, so it works before hydration too.
 */
export function GoogleSignInButton({
  locale,
  returnTo,
}: {
  locale: string
  returnTo?: string
}) {
  return (
    <form action={startGoogleSignInAction}>
      <input type="hidden" name="locale" value={locale} />
      {returnTo ? (
        <input type="hidden" name="returnTo" value={returnTo} />
      ) : null}
      <GoogleSubmit />
    </form>
  )
}

function GoogleSubmit() {
  const t = useTranslations('auth.phone.entry')
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="group flex h-13 w-full btn-tactile items-center justify-between rounded-xl border border-input bg-background px-4 text-start shadow-xs transition-colors outline-none hover:border-primary hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center">
          <GoogleMark />
        </span>
        <span className="flex flex-col">
          <span className="text-body font-semibold text-foreground transition-colors group-hover:text-link">
            {t(pending ? 'googlePending' : 'googleTitle')}
          </span>
          <span className="text-label text-muted-foreground">
            {t('googleSubtitle')}
          </span>
        </span>
      </span>
      <span className="text-body-sm font-medium text-link">
        {pending ? (
          <LoaderCircleIcon
            className="size-5 animate-spin motion-reduce:animate-none"
            aria-hidden
          />
        ) : (
          t('googleAction')
        )}
      </span>
    </button>
  )
}

/** Google's "G", in its brand colours (palette `google`). */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        className="fill-google-blue"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        className="fill-google-green"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        className="fill-google-yellow"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        className="fill-google-red"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  )
}
