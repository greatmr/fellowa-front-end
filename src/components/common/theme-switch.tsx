'use client'

import { useId, useRef, useSyncExternalStore, type KeyboardEvent } from 'react'
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'

import { cn } from '@/lib/utils'
import { getDirection } from '@/i18n/routing'

const OPTIONS = [
  { value: 'light', icon: SunIcon },
  { value: 'dark', icon: MoonIcon },
  { value: 'system', icon: MonitorIcon },
] as const

type ThemeValue = (typeof OPTIONS)[number]['value']

const noopSubscribe = () => () => {}

/**
 * Light · dark · system segmented control (presentation Sidebar "ظاهر",
 * @fdb5f6c). next-themes only knows the stored theme in the browser, so the
 * selection renders after hydration; the server output shows no option
 * selected rather than a wrong one.
 */
export function ThemeSwitch({ className }: { className?: string }) {
  const t = useTranslations('theme')
  const { theme, setTheme } = useTheme()
  const labelId = useId()
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const direction = getDirection(useLocale())
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  )
  const current: ThemeValue | undefined = hydrated
    ? OPTIONS.find((option) => option.value === theme)?.value
    : undefined

  function moveSelection(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const nextKey = direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    const previousKey = direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
    let next: number
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = OPTIONS.length - 1
    else if (event.key === nextKey || event.key === 'ArrowDown') {
      next = (index + 1) % OPTIONS.length
    } else if (event.key === previousKey || event.key === 'ArrowUp') {
      next = (index + OPTIONS.length - 1) % OPTIONS.length
    } else return

    event.preventDefault()
    setTheme(OPTIONS[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <p
        id={labelId}
        className="text-label font-semibold text-muted-foreground"
      >
        {t('label')}
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-orientation="horizontal"
        className="grid grid-cols-3 gap-1 rounded-md bg-secondary p-1"
      >
        {OPTIONS.map(({ value, icon: Icon }, index) => {
          const selected = current === value
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (!current && index === 0) ? 0 : -1}
              ref={(element) => {
                buttons.current[index] = element
              }}
              onKeyDown={(event) => moveSelection(event, index)}
              onClick={() => setTheme(value)}
              className={cn(
                'inline-flex min-w-0 items-center justify-center gap-1 rounded-md px-1 py-1.5 text-label font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                selected
                  ? 'bg-card text-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">{t(value)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
