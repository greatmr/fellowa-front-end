import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const inputVariants = cva(
  'flex h-10 w-full min-w-0 rounded-md border px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  {
    variants: {
      variant: {
        default: 'border-input bg-transparent shadow-xs',
        // Presentation `CompleteAccountScreen` @ 01fb04d: a muted well with no
        // edge that turns to the card surface on focus. Dark keeps a hairline
        // so the well is not lost on the card.
        filled:
          'border-transparent bg-muted focus-visible:bg-card dark:not-aria-invalid:not-focus-visible:border-input',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Input({
  className,
  type,
  variant = 'default',
  ...props
}: React.ComponentProps<'input'> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-variant={variant}
      className={cn(
        inputVariants({ variant }),
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  )
}

export { Input, inputVariants }
