import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { ErrorState } from '@/components/common/error-state'
import { ThemeSwitch } from '@/components/common/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PageNameForm } from '@/features/settings/components/page-name-form'
import { PasswordForm } from '@/features/settings/components/password-form'
import { PersonalForm } from '@/features/settings/components/personal-form'
import type {
  PageNameState,
  PersonalDetails,
} from '@/features/settings/types/settings'
import { Link } from '@/i18n/navigation'

/**
 * Account settings (FE-SET-01; presentation `SettingsView` @ fdb5f6c). The
 * prototype's single "display name" is the name at the top of the page: it is
 * the page's public name here (FE-AUTH-03, FQ-17), edited only once the
 * account has a page. The private first/last name are a separate, owner-only
 * record (Q-63). Its sign-in provider banner (Google / phone code) and phone
 * sign-in are not ported.
 */
export function SettingsView({
  viewerId,
  email,
  isVerified,
  personal,
  page,
  heading,
}: {
  viewerId: number
  email: string | null
  isVerified: boolean
  personal: PersonalDetails
  /** `null` when it could not be read. */
  page: PageNameState | null
  heading: ReactNode
}) {
  const t = useTranslations('settings')

  return (
    <div className="grid max-w-2xl gap-6">
      {heading}

      <Section title={t('account.title')}>
        <dl className="grid gap-1">
          <dt className="text-label text-muted-foreground">
            {t('account.email')}
          </dt>
          <dd className="flex flex-wrap items-center gap-2 text-body font-semibold">
            {email ? (
              <>
                <bdi dir="ltr">{email}</bdi>
                <Badge variant={isVerified ? 'money' : 'amber'}>
                  {isVerified ? t('account.verified') : t('account.unverified')}
                </Badge>
              </>
            ) : (
              // A phone-only account: its verified phone is not this row's.
              <span className="text-muted-foreground">
                {t('account.noEmail')}
              </span>
            )}
          </dd>
        </dl>
      </Section>

      <Section
        title={t('pageName.title')}
        description={t('pageName.description')}
      >
        {page === null ? (
          <ErrorState title={t('pageName.unavailable')} className="py-8" />
        ) : page.hasPage ? (
          <PageNameForm viewerId={viewerId} initial={page.pageName} />
        ) : (
          <div className="grid justify-items-start gap-3">
            <p className="text-body-sm text-muted-foreground">
              {t('pageName.noPage')}
            </p>
            <Button asChild variant="outline">
              <Link href="/onboarding">{t('pageName.noPageAction')}</Link>
            </Button>
          </div>
        )}
      </Section>

      <Section
        title={t('personal.title')}
        description={t('personal.description')}
      >
        <PersonalForm viewerId={viewerId} initial={personal} />
      </Section>

      <Section title={t('password.title')}>
        <PasswordForm viewerId={viewerId} email={email} />
      </Section>

      <Section title={t('appearance.title')}>
        <ThemeSwitch />
      </Section>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="gap-4 px-5 py-5 sm:px-6">
      <div className="grid gap-1">
        <h2 className="text-subtitle font-bold">{title}</h2>
        {description ? (
          <p className="text-body-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </Card>
  )
}
