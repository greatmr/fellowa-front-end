'use client'

import {
  ArrowUpDownIcon,
  GlobeIcon,
  LockIcon,
  LockOpenIcon,
  SearchIcon,
  SearchXIcon,
  SlidersHorizontalIcon,
  XIcon,
} from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { useState } from 'react'

import { EmptyState } from '@/components/common/empty-state'
import { RichBody } from '@/components/common/rich-body'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { postReaderUrl } from '@/features/dashboard/lib/public-address'
import {
  AUDIENCE_FILTERS,
  DEFAULT_FEED_FILTERS,
  type FeedFilters,
  POST_SORTS,
  RECENT_POSTS_LIMIT,
  filterFeed,
  hasActiveFeedFilters,
  isLongBody,
  postDate,
} from '@/features/dashboard/lib/recent-posts'
import type { DashboardPost } from '@/features/dashboard/types/dashboard'
import { CopyLinkButton } from '@/features/creator-page'
import { Link } from '@/i18n/navigation'
import { cn, isOneOf } from '@/lib/utils'

type Props = {
  /** The owner's posts, at FULL (`GET /content`); never empty here. */
  posts: DashboardPost[]
  /** The public page's absolute address; `null` without an app origin. */
  pageUrl: string | null
  /** The page answers 404 to others until it is published (FQ-29). */
  isPublished: boolean
}

/**
 * The recent-posts toolbar and feed (presentation `DashboardView`
 * :842-979 @ d843c3b, FE-DASH-04). Search, sort and the audience filter run
 * on the client over the posts the server already read; the prototype's
 * sort and filter buttons only toasted, these act. The audience shown and
 * filtered is what the owner chose; it decides no access.
 */
export function RecentPostsFeed({ posts, pageUrl, isPublished }: Props) {
  const t = useTranslations('panel.dashboard.posts')
  const locale = useLocale()
  const [filters, setFilters] = useState<FeedFilters>(DEFAULT_FEED_FILTERS)

  const matching = filterFeed(posts, filters, locale)
  const shown = matching.slice(0, RECENT_POSTS_LIMIT)

  return (
    <>
      <FeedToolbar filters={filters} onChange={setFilters} />
      {shown.length === 0 ? (
        <EmptyState
          icon={<SearchXIcon />}
          title={t('noMatchTitle')}
          description={t('noMatchBody')}
          action={
            hasActiveFeedFilters(filters) ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  setFilters({ ...DEFAULT_FEED_FILTERS, sort: filters.sort })
                }
              >
                {t('clearFilters')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-4">
          {shown.map((post) => (
            <li key={post.id}>
              <FeedCard
                post={post}
                shareUrl={isPublished ? postReaderUrl(pageUrl, post.id) : null}
              />
            </li>
          ))}
        </ul>
      )}
      {matching.length > shown.length ? (
        <Button asChild size="sm" variant="link" className="justify-self-start">
          <Link href="/posts">{t('seeAll')}</Link>
        </Button>
      ) : null}
    </>
  )
}

function FeedToolbar({
  filters,
  onChange,
}: {
  filters: FeedFilters
  onChange: (filters: FeedFilters) => void
}) {
  const t = useTranslations('panel.dashboard.posts')
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={filters.sort}
        onValueChange={(value) => {
          if (isOneOf(POST_SORTS, value)) onChange({ ...filters, sort: value })
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={t('sortLabel')}
          className="w-auto bg-background"
        >
          <ArrowUpDownIcon
            aria-hidden
            className="size-3.5 text-muted-foreground"
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {POST_SORTS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`sort.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.audience}
        onValueChange={(value) => {
          if (isOneOf(AUDIENCE_FILTERS, value)) {
            onChange({ ...filters, audience: value })
          }
        }}
      >
        <SelectTrigger
          size="sm"
          aria-label={t('filterLabel')}
          className="w-auto bg-background"
        >
          <SlidersHorizontalIcon
            aria-hidden
            className="size-3.5 text-muted-foreground"
          />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AUDIENCE_FILTERS.map((value) => (
            <SelectItem key={value} value={value}>
              {t(`filter.${value}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative min-w-50 flex-1">
        <SearchIcon
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(event) =>
            onChange({ ...filters, query: event.target.value })
          }
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          className="h-9 bg-background ps-9 pe-9"
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => onChange({ ...filters, query: '' })}
            aria-label={t('clearSearch')}
            className="absolute inset-y-0 end-3 my-auto flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <XIcon aria-hidden className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  )
}

function FeedCard({
  post,
  shareUrl,
}: {
  post: DashboardPost
  shareUrl: string | null
}) {
  const t = useTranslations('panel.dashboard.posts')
  const format = useFormatter()
  const date = postDate(post)
  const isDraft = post.publishedAt === null
  const long = post.body !== null && isLongBody(post.body)

  return (
    <Card className="gap-4 p-6">
      <div className="grid gap-1">
        <h3 dir="auto" className="text-subtitle font-bold text-foreground">
          {post.title}
        </h3>
        <p className="text-label font-medium text-muted-foreground">
          <time dateTime={date}>
            {format.dateTime(new Date(date), { dateStyle: 'medium' })}
          </time>
        </p>
      </div>
      {post.body ? (
        <div className="grid gap-2">
          {/* The owner's own post at FULL: the whole body, as the API sent
              it (an html body is server-sanitised, Q-83). */}
          <RichBody
            body={post.body}
            className={cn(
              'text-body leading-relaxed text-foreground',
              long && 'line-clamp-6'
            )}
          />
          {long ? (
            <Button
              asChild
              size="sm"
              variant="link"
              className="h-auto justify-self-start p-0"
            >
              <Link href={`/posts/${post.id}/edit`}>{t('readMore')}</Link>
            </Button>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 border-t pt-3">
        {isDraft ? <Badge variant="neutral">{t('draft')}</Badge> : null}
        <div className="ms-auto flex flex-wrap items-center gap-3">
          {isDraft ? null : (
            <CopyLinkButton
              url={shareUrl}
              label={t('share')}
              variant="ghost"
              size="sm"
              className="h-8 text-label text-muted-foreground hover:text-foreground"
              messages={{ copied: t('shareCopied'), failed: t('shareFailed') }}
            />
          )}
          <AudienceStatus audience={post.audience} />
        </div>
      </div>
    </Card>
  )
}

/** The audience the owner chose, as text (design :962-976). */
function AudienceStatus({ audience }: { audience: DashboardPost['audience'] }) {
  const t = useTranslations('panel.dashboard.posts')
  const [Icon, label, tone] =
    audience === 'public'
      ? [GlobeIcon, t('public'), 'text-muted-foreground']
      : audience === 'paywalled'
        ? [LockOpenIcon, t('paywalled'), 'text-warning-emphasis']
        : [LockIcon, t('locked'), 'text-warning-emphasis']
  return (
    <span
      className={cn('flex items-center gap-1 text-label font-medium', tone)}
    >
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  )
}
