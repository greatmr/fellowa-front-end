'use client'

import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { getDirection } from '@/i18n/routing'
import { cn } from '@/lib/utils'

function Toaster({ className, toastOptions, ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()
  const t = useTranslations('common')
  const direction = getDirection(useLocale())
  const supportedTheme =
    theme === 'light' || theme === 'dark' ? theme : 'system'

  return (
    <Sonner
      theme={supportedTheme}
      dir={direction}
      className={cn('toaster group', className)}
      containerAriaLabel={t('notifications')}
      closeButton
      toastOptions={{ closeButtonAriaLabel: t('close'), ...toastOptions }}
      {...props}
    />
  )
}

export { Toaster }
