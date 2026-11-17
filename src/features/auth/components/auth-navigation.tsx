import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/features/auth/components/logout-button'
import { getSession } from '@/features/auth/server/session'
import { Link } from '@/i18n/navigation'

export async function AuthNavigation({ studio = false }: { studio?: boolean }) {
  const t = await getTranslations('auth')
  const publicT = await getTranslations('publicLayout')
  const session = await getSession()

  if (!session && studio) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/auth">{t('nav.login')}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/auth">{t('nav.register')}</Link>
        </Button>
      </div>
    )
  }

  // The public header's pill buttons (presentation `LandingView` `.fw-btn-md`
  // @ 798f660). Both open the same phone-first entry, so the outline "sign
  // in" is dropped on phones to keep the bar on one line.
  if (!session) {
    return (
      <div className="flex shrink-0 items-center gap-3">
        <Button
          asChild
          variant="outline"
          className="hidden rounded-full border-input bg-card/55 px-5.5 shadow-none backdrop-blur-md sm:inline-flex"
        >
          <Link href="/auth">{t('nav.login')}</Link>
        </Button>
        <Button asChild className="rounded-full px-4 shadow-brand sm:px-5.5">
          <Link href="/auth">
            <span className="sm:hidden">{t('nav.register')}</span>
            <span className="hidden sm:inline">{publicT('startCreator')}</span>
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {studio ? (
        // A phone-only account has no email (BE-AUTH-08) and shows nothing.
        session.user.email && (
          <span
            className="hidden max-w-48 truncate text-body-sm text-muted-foreground sm:inline"
            title={t('nav.signedInAs', { email: session.user.email })}
          >
            <bdi>{session.user.email}</bdi>
          </span>
        )
      ) : (
        <Button asChild className="rounded-full px-5.5 shadow-brand">
          <Link
            href={session.user.isVerified ? '/studio' : '/auth/verify-email'}
          >
            {session.user.isVerified ? publicT('studio') : t('verify.title')}
          </Link>
        </Button>
      )}
      <LogoutButton />
    </div>
  )
}
