import { UserIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

/**
 * The live page preview of the address step (presentation
 * `CreatorPreviewCard` @ fdb5f6c): the name saved on the account step and the
 * address being typed, skeletons until there is one. Not ported: the topic
 * chips (interests are out, FQ-4) and social icons (socials are not part of
 * sign-up); the row says none are added yet, which is true of a page being
 * created.
 */
export function CreatorPreviewCard({
  name,
  address,
}: {
  name: string
  address: string
}) {
  const t = useTranslations('auth')
  const displayName = name.trim()
  const slug = address.trim()

  return (
    <div className="w-full max-w-92 overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-panel">
      <div className="relative h-28 w-full overflow-hidden bg-linear-to-r from-brand-600 via-violet-600 to-money-500">
        <div className="absolute inset-0 dot-grid-sm opacity-25" />
        <span className="absolute end-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-caption font-bold text-brand-600 shadow-xs">
          {t('preview.badge')}
        </span>
      </div>
      <div className="relative px-5 pt-0 pb-5">
        <div className="-mt-10 mb-3 flex items-end justify-between">
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-info-subtle text-headline font-bold text-info-emphasis shadow-md">
            {displayName ? (
              displayName.charAt(0)
            ) : (
              <UserIcon className="size-7 text-muted-foreground" />
            )}
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-subtle px-2.5 py-1 text-caption font-semibold text-success-emphasis">
            <span className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" />
            {t('preview.kind')}
          </span>
        </div>
        <div className="mb-1.5 min-h-7">
          {displayName ? (
            <h3 className="text-title-sm leading-snug font-bold break-words text-foreground">
              {displayName}
            </h3>
          ) : (
            <div className="h-6 w-44 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          )}
        </div>
        <div className="mb-3.5 min-h-5.5">
          {slug ? (
            <p
              dir="ltr"
              className="text-start text-body-sm font-medium tracking-tight text-muted-foreground rtl:text-end"
            >
              {t('url.prefix')}
              <span className="font-bold text-link">{slug}</span>
            </p>
          ) : (
            <div className="h-4 w-32 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          )}
        </div>
        <div className="flex min-h-10 items-center justify-between border-t border-border pt-3">
          <span className="text-label text-muted-foreground">
            {t('preview.noSocials')}
          </span>
          <span className="text-caption font-semibold text-muted-foreground">
            {t('preview.supporters', { count: 0 })}
          </span>
        </div>
      </div>
    </div>
  )
}
