'use client'

import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { getDirection } from '@/i18n/routing'
import { cn } from '@/lib/utils'

/**
 * Presentation toast (`ui/Toast` @ efc3a57): bottom-centre, 3.2s, an inverse
 * surface (globals.css) with the tone carried by a tinted icon. The prototype's
 * success/pop sounds are not ported (FQ-9).
 */
// The prototype's tints; on the white dark-mode surface money-500 and amber-500
// fall below 3:1, so those two step darker there (ledger drift table).
const toneIcons: ToasterProps['icons'] = {
  success: (
    <CircleCheck
      className="size-4 text-money-500 dark:text-money-600"
      strokeWidth={2.2}
    />
  ),
  error: <CircleAlert className="size-4 text-red-500" strokeWidth={2.2} />,
  info: <Info className="size-4 text-brand-400" strokeWidth={2.2} />,
  warning: (
    <TriangleAlert
      className="size-4 text-amber-500 dark:text-amber-700"
      strokeWidth={2.2}
    />
  ),
}

function Toaster({ className, toastOptions, icons, ...props }: ToasterProps) {
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
      position="bottom-center"
      duration={3200}
      icons={{ ...toneIcons, ...icons }}
      closeButton
      toastOptions={{ closeButtonAriaLabel: t('close'), ...toastOptions }}
      {...props}
    />
  )
}

export { Toaster }
