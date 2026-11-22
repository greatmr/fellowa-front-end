import {
  ArrowLeftIcon,
  AudioLinesIcon,
  ExternalLinkIcon,
  LockIcon,
  PaperclipIcon,
  VideoIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { ReaderPostData } from '@/features/post-reader/server/load-reader-post'
import type {
  FullReaderPost,
  ReaderViewer,
} from '@/features/post-reader/types/reader-post'
import { Link } from '@/i18n/navigation'

/**
 * The gated post reader (FE-CONT-01; presentation `CreatorProfileView` post
 * cards, paywall gate `:953-997`, `.divider-paywall` and `.teaser-fade` in
 * `index.css` @ d843c3b). It renders exactly the level the backend named and
 * the keys that level carries: FULL the whole post, PARTIAL the opening the
 * server cut and the divider, TEASER the owner's preview and the gate. The
 * gate leads to the creator's Tiers tab, never to a purchase (FQ-31). Not
 * ported: likes, comments, share, the creator byline (no response names the
 * page), the tier name on the gate (no response names it) and single-post
 * purchase.
 */
export function PostReaderView({ creatorId, post, viewer }: ReaderPostData) {
  const t = useTranslations('postReader')
  const format = useFormatter()

  return (
    <article className="mx-auto grid max-w-2xl gap-4">
      <Link
        href={`/creators/${creatorId}`}
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-body-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ArrowLeftIcon aria-hidden className="size-4 rtl:rotate-180" />
        {t('backToPage')}
      </Link>

      <Card className="gap-0 overflow-hidden p-0">
        <header className="grid gap-2 px-5 pt-5">
          {post.access === 'FULL' ? null : (
            <Badge variant="violet">
              <LockIcon aria-hidden />
              {t('membersBadge')}
            </Badge>
          )}
          <h1 dir="auto" className="text-title font-bold text-foreground">
            {post.title}
          </h1>
          <p className="text-label text-muted-foreground">
            <time dateTime={post.createdAt}>
              {format.dateTime(new Date(post.createdAt), {
                dateStyle: 'medium',
              })}
            </time>
          </p>
        </header>

        {post.access === 'FULL' ? (
          <FullBody post={post} />
        ) : post.access === 'PARTIAL' ? (
          <div className="grid gap-4 px-5 pt-4 pb-5">
            {post.text ? <BodyText text={post.text} /> : null}
            <div
              role="separator"
              aria-label={t('dividerLabel')}
              className="flex items-center gap-3"
            >
              <span
                aria-hidden
                className="h-px flex-1 border-t-2 border-dashed border-violet-300 dark:border-violet-500/40"
              />
              <span className="rounded-full bg-violet-50 px-3 py-1 text-label font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
                {t('dividerLabel')}
              </span>
              <span
                aria-hidden
                className="h-px flex-1 border-t-2 border-dashed border-violet-300 dark:border-violet-500/40"
              />
            </div>
            <PostGate creatorId={creatorId} postId={post.id} viewer={viewer} />
          </div>
        ) : (
          <div className="grid gap-2 px-5 pt-2 pb-5">
            {post.textPreview ? (
              <div className="teaser-fade">
                <BodyText text={post.textPreview} />
              </div>
            ) : null}
            <PostGate creatorId={creatorId} postId={post.id} viewer={viewer} />
          </div>
        )}
      </Card>
    </article>
  )
}

function BodyText({ text }: { text: string }) {
  return (
    <p
      dir="auto"
      className="text-body leading-8 whitespace-pre-line text-foreground"
    >
      {text}
    </p>
  )
}

function FullBody({ post }: { post: FullReaderPost }) {
  const t = useTranslations('postReader')

  return (
    <div className="grid gap-5 px-5 pt-4 pb-5">
      {post.text ? <BodyText text={post.text} /> : null}

      {post.images.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {post.images.map((image, index) =>
            image.url ? (
              <li key={image.id}>
                {/* No allowed host in `images.remotePatterns` yet: unoptimized,
                    as the studio renders the same URLs. */}
                <Image
                  src={image.url}
                  alt={t('imageAlt', { index: index + 1 })}
                  width={1200}
                  height={900}
                  unoptimized
                  className="h-auto w-full rounded-md border border-border object-cover"
                />
              </li>
            ) : null
          )}
        </ul>
      ) : null}

      {post.videoCount > 0 ? (
        <MediaNotice
          icon={<VideoIcon aria-hidden />}
          text={t('videoUnavailable', { count: post.videoCount })}
        />
      ) : null}
      {post.audios.length > 0 ? (
        <MediaNotice
          icon={<AudioLinesIcon aria-hidden />}
          text={
            post.audios.every((audio) => audio.ready)
              ? t('audioUnavailable', { count: post.audios.length })
              : t('audioProcessing')
          }
        />
      ) : null}

      {post.poll ? (
        <section
          aria-labelledby={`poll-${post.poll.id}`}
          className="grid gap-2"
        >
          <h2
            id={`poll-${post.poll.id}`}
            className="text-body font-semibold text-foreground"
          >
            {t('pollTitle')}
          </h2>
          <ul className="grid gap-2">
            {post.poll.options.map((option) => (
              <li
                key={option.id}
                dir="auto"
                className="rounded-md border border-border px-4 py-2.5 text-body text-foreground"
              >
                {option.label}
              </li>
            ))}
          </ul>
          <p className="text-caption text-muted-foreground">
            {t('pollVotingSoon')}
          </p>
        </section>
      ) : null}

      {post.links.some((link) => link.url) ? (
        <ul className="grid gap-2">
          {post.links.map((link) =>
            link.url ? (
              <li key={link.id}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow ugc"
                  className="inline-flex max-w-full items-center gap-1.5 text-body-sm text-link underline-offset-4 hover:underline"
                >
                  <ExternalLinkIcon aria-hidden className="size-4 shrink-0" />
                  <bdi dir="ltr" className="truncate">
                    {link.url}
                  </bdi>
                </a>
              </li>
            ) : null
          )}
        </ul>
      ) : null}

      {post.attachments.some((file) => file.url) ? (
        <section className="grid gap-2">
          <h2 className="text-body font-semibold text-foreground">
            {t('attachmentsTitle')}
          </h2>
          <ul className="grid gap-2">
            {post.attachments.map((file, index) =>
              file.url ? (
                <li key={file.id}>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1.5 text-body-sm text-link underline-offset-4 hover:underline"
                  >
                    <PaperclipIcon aria-hidden className="size-4 shrink-0" />
                    {t('attachment', { index: index + 1 })}
                  </a>
                </li>
              ) : null
            )}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

function MediaNotice({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-md bg-muted px-4 py-3 text-body-sm text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
      {icon}
      {text}
    </p>
  )
}

/**
 * The paywall gate (presentation `:953-997`). Its only action is the
 * creator's Tiers tab: there is no single-post purchase (FQ-31), and joining
 * opens from that tab once checkout exists (FE-PAY-01). A visitor who is
 * already a member is offered sign-in, back to this post: the anonymous read
 * never unlocks (FQ-33 option A).
 */
function PostGate({
  creatorId,
  postId,
  viewer,
}: {
  creatorId: number
  postId: number
  viewer: ReaderViewer
}) {
  const t = useTranslations('postReader.gate')

  return (
    <section
      aria-labelledby="post-gate-title"
      className="grid gap-3.5 rounded-md border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-500/20 dark:bg-violet-500/10"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-violet-600 text-white">
          <LockIcon aria-hidden className="size-3.5" />
        </span>
        <h2
          id="post-gate-title"
          className="text-body-sm font-bold text-violet-900 dark:text-violet-200"
        >
          {t('title')}
        </h2>
      </div>
      <p className="text-body-sm text-muted-foreground">{t('body')}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button asChild>
          <Link
            href={{
              pathname: `/creators/${creatorId}`,
              query: { tab: 'tiers' },
            }}
          >
            {t('seeTiers')}
          </Link>
        </Button>
        {viewer === 'anonymous' ? (
          <Button asChild variant="ghost">
            <Link
              href={{
                pathname: '/auth',
                query: { returnTo: `/creators/${creatorId}/posts/${postId}` },
              }}
            >
              {t('signIn')}
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
