import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'

/**
 * The public header's actions (presentation `LandingView` `.fw-actions` @
 * d843c3b, FE-LAND-03): an outline "sign in" and the dark call to action,
 * 8px corners, no glow. Both open the same phone-first entry, so the outline
 * "sign in" is dropped on phones to keep the bar on one line. Signed in: one
 * way into the panel; sign-out lives in the panel's account menu, and the
 * panel sends an unverified account on to verification.
 */
export function AuthActions({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations('auth')
  const publicT = useTranslations('publicLayout')

  if (signedIn) {
    return (
      <Button asChild variant="dark" className="shrink-0">
        <Link href="/dashboard">{publicT('dashboard')}</Link>
      </Button>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <Button
        asChild
        variant="outline"
        className="hidden border-foreground/12 bg-card/72 shadow-none backdrop-blur-md hover:border-foreground/18 hover:bg-accent sm:inline-flex"
      >
        <Link href="/auth">{t('nav.login')}</Link>
      </Button>
      <Button asChild variant="dark">
        <Link href="/auth">
          <span className="sm:hidden">{t('nav.register')}</span>
          <span className="hidden sm:inline">{publicT('startCreator')}</span>
        </Link>
      </Button>
    </div>
  )
}
