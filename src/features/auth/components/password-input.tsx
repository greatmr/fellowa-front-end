'use client'

import { useState, type ComponentProps } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { AuthFormControl } from './auth-form-control'

/** A password field for an auth form, with its show/hide toggle. */
export function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, 'type' | 'dir'>
) {
  const t = useTranslations('auth')
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative" dir="ltr">
      <AuthFormControl serverError={false}>
        <Input
          {...props}
          className="pe-12"
          type={visible ? 'text' : 'password'}
          dir="ltr"
        />
      </AuthFormControl>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute inset-y-0 end-0.5 my-auto"
        aria-label={t(visible ? 'password.hide' : 'password.show')}
        aria-pressed={visible}
        onClick={() => setVisible((value) => !value)}
      >
        {visible ? <EyeOffIcon aria-hidden /> : <EyeIcon aria-hidden />}
      </Button>
    </div>
  )
}
