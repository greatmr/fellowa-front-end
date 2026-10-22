import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2.5 py-0.5 text-label font-semibold whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        outline:
          'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        // Tinted status tones (presentation Badge). Text/tint pairs are
        // AA-checked in both themes; see .claude/references/ui-and-theme.md.
        brand:
          'border-transparent bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
        violet:
          'border-transparent bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
        money:
          'border-transparent bg-money-50 text-money-700 dark:bg-money-500/15 dark:text-money-300',
        amber:
          'border-transparent bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
        red: 'border-transparent bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300',
        neutral:
          'border-transparent bg-ink-900/5 text-ink-700 dark:bg-white/8 dark:text-ink-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
