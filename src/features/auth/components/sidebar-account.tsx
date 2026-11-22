import { getTranslations } from 'next-intl/server'

import { AccountMenu } from '@/features/auth/components/account-menu'
import { getSession } from '@/features/auth/server/session'

/**
 * The signed-in account for the creator sidebar. The creator layout's
 * SessionGate has already required a session; without one this renders
 * nothing. Name: the account's own name, else `@alias`, else the email; the
 * subtitle is the first of `@alias` and email that differs from it (design).
 */
export async function SidebarAccount({
  ownPageHref,
}: {
  /** The creator's public page (`/creators/:id`), for "View my page". */
  ownPageHref?: string
}) {
  const session = await getSession()
  if (!session) return null
  const t = await getTranslations('panel.account')

  const { displayName, alias, email } = session.user
  const handle = alias?.trim() ? `@${alias.trim()}` : null
  const name = displayName?.trim() || handle || email || t('unnamed')
  const subtitle = [handle, email].find((value) => value && value !== name)

  return (
    <AccountMenu
      name={name}
      subtitle={subtitle ?? undefined}
      initial={(Array.from(name.replace(/^@/, ''))[0] ?? '').toUpperCase()}
      ownPageHref={ownPageHref}
    />
  )
}
