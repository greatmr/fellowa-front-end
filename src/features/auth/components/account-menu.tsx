'use client'

import { useSyncExternalStore } from 'react'
import { ChevronsUpDownIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'

import {
  LogoutIcon,
  OpenPageIcon,
  ProfileMeIcon,
  SettingsIcon,
  WalletIcon,
} from '@/components/icons/app-icons'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/components/logout-button'
import { hookFeedback, sessionLost } from '@/features/auth/lib/hook-feedback'
import { Link, useRouter } from '@/i18n/navigation'
import { getDirection } from '@/i18n/routing'

const THEMES = ['light', 'dark', 'system'] as const

const noopSubscribe = () => () => {}

export type AccountMenuProps = {
  name: string
  /** Email or `@alias`; omitted when it would repeat the name. */
  subtitle?: string
  initial: string
  /** The creator's public page (`/creators/:id`); the item is left out without it. */
  ownPageHref?: string
}

/**
 * The creator sidebar's account row and its menu (presentation Sidebar
 * "Account row & popover", d843c3b). The menu opens beside the rail on its
 * logical end side. Identity comes from the session; there is no avatar
 * image source yet, so the avatar is the name's initial.
 */
export function AccountMenu({
  name,
  subtitle,
  initial,
  ownPageHref,
}: AccountMenuProps) {
  const t = useTranslations('panel.account')
  const tTheme = useTranslations('theme')
  const tAuth = useTranslations('auth')
  const direction = getDirection(useLocale())
  const { theme, setTheme } = useTheme()
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const logout = useLogout()
  const router = useRouter()

  function signOut() {
    logout.submit((error) => {
      // Already signed out (expired or revoked): finish where logout would.
      if (sessionLost(error)) {
        router.replace('/auth')
        return
      }
      const feedback = hookFeedback(error)
      const key = `errors.${feedback.status === 'error' ? feedback.error : ''}`
      toast.error(tAuth(tAuth.has(key) ? key : 'errors.unexpected'))
    })
  }

  const avatar = (
    <Avatar className="size-8">
      <AvatarFallback className="bg-brand-100 text-label font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
        {initial}
      </AvatarFallback>
    </Avatar>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('trigger', { name })}
        title={name}
        className="flex h-12 w-full items-center gap-2.5 rounded-md px-2 text-start transition-colors outline-none group-data-[collapsed=true]/sidebar:justify-center group-data-[collapsed=true]/sidebar:px-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50 data-[state=open]:bg-accent"
      >
        {avatar}
        <span className="min-w-0 flex-1 leading-tight group-data-[collapsed=true]/sidebar:hidden">
          <span className="block truncate text-body font-semibold text-foreground">
            {name}
          </span>
          {subtitle ? (
            <bdi className="block truncate text-label text-muted-foreground">
              {subtitle}
            </bdi>
          ) : null}
        </span>
        <ChevronsUpDownIcon
          className="size-4 shrink-0 text-ink-400 group-data-[collapsed=true]/sidebar:hidden"
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={direction === 'rtl' ? 'left' : 'right'}
        align="end"
        sideOffset={14}
        collisionPadding={12}
        className="w-76 animate-pop-in rounded-xl p-2.5 shadow-panel"
      >
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2 font-normal">
          <Avatar className="size-9">
            <AvatarFallback className="bg-brand-100 text-body font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
              {initial}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-body font-semibold text-foreground">
              {name}
            </span>
            {subtitle ? (
              <bdi className="block truncate text-label text-muted-foreground">
                {subtitle}
              </bdi>
            ) : null}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuLabel className="px-2.5 pt-1.5 pb-0 text-label font-semibold text-muted-foreground">
          {tTheme('label')}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={hydrated ? theme : undefined}
          onValueChange={setTheme}
          className="mx-2.5 my-1.5 grid grid-cols-3 gap-1 rounded-md bg-secondary p-1"
        >
          {THEMES.map((value) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              // Keep the menu open so the change can be seen.
              onSelect={(event) => event.preventDefault()}
              className="justify-center rounded-sm px-1 py-1 text-label font-semibold text-muted-foreground focus:bg-card/60 data-[state=checked]:bg-card data-[state=checked]:text-foreground data-[state=checked]:shadow-soft [&>span:first-child]:hidden"
            >
              {tTheme(value)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator className="my-1.5" />

        {ownPageHref ? (
          <DropdownMenuItem asChild className={itemClass}>
            <Link href={ownPageHref}>
              <ProfileMeIcon className="size-4 text-ink-500" />
              <span className="flex-1">{t('viewPage')}</span>
              <OpenPageIcon className="size-4 text-ink-400" />
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/memberships">
            <WalletIcon className="size-4 text-ink-500" />
            {t('memberships')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={itemClass}>
          <Link href="/settings">
            <SettingsIcon className="size-4 text-ink-500" />
            {t('settings')}
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onSelect={signOut}
          className={itemClass}
        >
          <LogoutIcon className="size-4" />
          {t(logout.isPending ? 'loggingOut' : 'logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const itemClass = 'gap-2.5 rounded-md px-2.5 py-2 text-body-sm font-medium'
