'use client'

import { useState } from 'react'
import { ExternalLinkIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

type Props = {
  kind: 'video' | 'audio'
  /** An http(s) URL the server sent (`playbackUrl`), already checked. */
  src: string
  /** What is playing, for the accessible name: the post title or file name. */
  title?: string | null
  className?: string
}

/**
 * Plays a post's video or audio from the server's `playbackUrl` (BE-CONT-16):
 * the browser's own controls, no autoplay, only metadata loaded up front. A
 * format the browser cannot decode (MOV, MKV) fires `error`, and the player
 * gives way to a line and a link that opens the file. Rendered only where the
 * server sent a URL, which it does at FULL alone.
 */
export function PostMediaPlayer({ kind, src, title, className }: Props) {
  const t = useTranslations('common.mediaPlayer')
  // Keyed on the source, so a new file gets a fresh try.
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const label = title?.trim()
    ? t(kind === 'video' ? 'videoLabel' : 'audioLabel', { title: title.trim() })
    : t(kind)

  if (failedSrc === src) {
    return (
      <div
        role="status"
        className={cn(
          'grid gap-1.5 rounded-md border border-border bg-muted/40 p-3',
          className
        )}
      >
        <p className="text-body-sm text-foreground">{t('unsupported')}</p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 text-body-sm text-link underline-offset-4 hover:underline"
        >
          <ExternalLinkIcon aria-hidden className="size-4 shrink-0" />
          {t('openFile')}
        </a>
      </div>
    )
  }

  const onError = () => setFailedSrc(src)
  // An error before hydration fired with no listener attached; read it back.
  const checkEarlyError = (element: HTMLMediaElement | null) => {
    if (element?.error) setFailedSrc(src)
  }

  return kind === 'video' ? (
    <video
      ref={checkEarlyError}
      src={src}
      controls
      preload="metadata"
      playsInline
      aria-label={label}
      onError={onError}
      className={cn(
        'aspect-video w-full max-w-full rounded-md border border-border bg-muted',
        className
      )}
    />
  ) : (
    <audio
      ref={checkEarlyError}
      src={src}
      controls
      preload="metadata"
      aria-label={label}
      onError={onError}
      className={cn('w-full max-w-full', className)}
    />
  )
}
