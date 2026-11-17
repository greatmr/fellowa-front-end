'use client'

import { SearchIcon, XIcon } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'

import { useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

/**
 * The public header's always-open search (presentation `LandingView`
 * `.fw-search` @ 798f660). Submitting opens the public creator list with the
 * query in `?q=`, which that page searches by alias. The prototype's
 * suggestion dropdown lists mock creators and is not ported.
 */
export function PublicSearch({ className }: { className?: string }) {
  const t = useTranslations('publicLayout')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const q = value.trim()
    router.push(q ? { pathname: '/creators', query: { q } } : '/creators')
  }

  return (
    <form role="search" onSubmit={submit} className={className}>
      <div className="flex h-10 w-47.5 items-center gap-2.25 rounded-full border border-input bg-card/55 px-4 backdrop-blur-md transition-[width,border-color,box-shadow] duration-300 focus-within:w-75 focus-within:border-primary focus-within:ring-3 focus-within:ring-primary/10 motion-reduce:transition-none">
        <SearchIcon
          className="size-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          name="q"
          enterKeyHint="search"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          className="min-w-0 flex-1 bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          type="button"
          aria-label={t('searchClear')}
          onClick={() => {
            setValue('')
            inputRef.current?.focus()
          }}
          className={cn(
            'flex shrink-0 rounded-full p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
            !value && 'hidden'
          )}
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      </div>
    </form>
  )
}
