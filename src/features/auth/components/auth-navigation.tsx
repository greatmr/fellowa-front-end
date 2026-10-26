import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import { LogoutButton } from '@/features/auth/components/logout-button'
import { getSession } from '@/features/auth/server/session'
import { Link } from '@/i18n/navigation'

export async function AuthNavigation({ studio = false }: { studio?: boolean }) {
  const t = await getTranslations('auth')
  const publicT = await getTranslations('publicLayout')
  const session = await getSession()

  if (!session) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/auth/login">{t('nav.login')}</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/auth/register">{t('nav.register')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {studio ? (
        <span
          className="hidden max-w-48 truncate text-body-sm text-muted-foreground sm:inline"
          title={t('nav.signedInAs', { email: session.user.email })}
        >
          <bdi>{session.user.email}</bdi>
        </span>
      ) : (
        <Button asChild size="sm">
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
