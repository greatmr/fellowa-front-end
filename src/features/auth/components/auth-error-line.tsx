'use client'

import { AlertCircleIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { useFormField } from '@/components/ui/form'
import { cn } from '@/lib/utils'

/**
 * The auth screens' error: one line of destructive text with an alert icon,
 * directly under the field it is about (presentation `LoginOrSignupScreen`,
 * `VerifyCodeScreen`, `PhonePasswordLoginScreen`, `CompleteAccountScreen` @
 * 01fb04d). No border and no fill. A server error passes `role="alert"`; a
 * field error does not, because the field's `aria-describedby` already
 * reaches it.
 */
export function AuthErrorLine({
  centered = false,
  className,
  children,
  ...props
}: ComponentProps<'p'> & { centered?: boolean }) {
  return (
    <p
      {...props}
      className={cn(
        'flex items-center gap-1.5 text-label text-destructive',
        centered && 'justify-center text-center',
        className
      )}
    >
      <AlertCircleIcon className="size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

/**
 * `FormMessage` in the auth line's shape: the field's validation message,
 * with the icon, under the same id the control is described by.
 */
export function AuthFieldMessage({ className }: { className?: string }) {
  const { error, formMessageId } = useFormField()
  const body = error?.message ? String(error.message) : null
  if (!body) return null
  return (
    <AuthErrorLine
      id={formMessageId}
      data-slot="form-message"
      className={className}
    >
      {body}
    </AuthErrorLine>
  )
}

/**
 * The field's hint, or its error in the hint's place (presentation
 * `CompleteAccountScreen` @ 01fb04d): never both.
 */
export function AuthFieldHint({ children }: { children: string }) {
  const { error, formDescriptionId } = useFormField()
  if (error?.message) return <AuthFieldMessage />
  return (
    <p
      id={formDescriptionId}
      data-slot="form-description"
      className="text-label text-muted-foreground"
    >
      {children}
    </p>
  )
}
