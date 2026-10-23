'use client'

import type { ComponentProps } from 'react'

import { FormControl, useFormField } from '@/components/ui/form'

/** Associate both RHF and returned server validation with the same message. */
export function AuthFormControl({
  serverError,
  ...props
}: ComponentProps<typeof FormControl> & { serverError?: boolean }) {
  const { error, formDescriptionId, formMessageId } = useFormField()

  return (
    <FormControl
      {...props}
      aria-describedby={`${formDescriptionId}${error || serverError ? ` ${formMessageId}` : ''}`}
    />
  )
}
