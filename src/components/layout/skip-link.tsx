import { useTranslations } from 'next-intl'

/** Every frame exposes the same keyboard entry point for its content. */
export function SkipLink() {
  const t = useTranslations('common')

  return (
    <a
      href="#main-content"
      className="fixed start-4 top-3 z-100 -translate-y-24 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-soft transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
    >
      {t('skipToContent')}
    </a>
  )
}
