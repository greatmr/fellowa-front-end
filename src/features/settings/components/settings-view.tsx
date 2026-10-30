import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { ThemeSwitch } from '@/components/common/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { PasswordForm } from '@/features/settings/components/password-form'
import { PersonalForm } from '@/features/settings/components/personal-form'
import type { PersonalDetails } from '@/features/settings/types/settings'

/**
 * Account settings (FE-SET-01; presentation `SettingsView` @ fdb5f6c). The
 * prototype's single "display name" has no backend field (BE-USER-02 leaves a
 * public display name open); the private first/last name stand in. Its
 * sign-in provider banner (Google / phone code) and phone sign-in do not
 * exist here — the account signs in with email and password (C-4).
 */
export function SettingsView({
  viewerId,
  email,
  isVerified,
  personal,
  heading,
}: {
  viewerId: number
  email: string
  isVerified: boolean
  personal: PersonalDetails
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
            <bdi dir="ltr">{email}</bdi>
            <Badge variant={isVerified ? 'money' : 'amber'}>
              {isVerified ? t('account.verified') : t('account.unverified')}
            </Badge>
          </dd>
        </dl>
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
