import { cn } from '@/lib/utils'

/**
 * Title block at the top of a studio page (presentation Header `VIEW_TITLES`).
 * `description` renders the hint under the title inside the same block; pass
 * `className="mb-0"` when the block sits in a row with actions beside it.
 */
export function PageHeader({
  title,
  category,
  description,
  className,
}: {
  title: string
  category?: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('mb-6 flex flex-col gap-1', className)}>
      {category ? (
        <p className="text-label font-semibold text-muted-foreground">
          {category}
        </p>
      ) : null}
      <h1 className="text-title font-bold tracking-tight text-foreground">
        {title}
      </h1>
      {description ? (
        <p className="text-label text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
