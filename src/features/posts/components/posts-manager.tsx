'use client'

import { useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  FileTextIcon,
  Globe,
  Lock,
  RotateCcw,
  Search,
  SquarePen,
  Trash2,
  X,
} from 'lucide-react'
import { useFormatter, useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  useDeletePostMutation,
  usePostsQuery,
  useSetPostStatusMutation,
} from '@/features/posts/api/post-hooks'
import { PostConfirmDialog } from '@/features/posts/components/post-confirm-dialog'
import { isEditableType, statusInput } from '@/features/posts/lib/post-draft'
import { postErrorKey } from '@/features/posts/lib/post-errors'
import {
  ACCESS_FILTERS,
  POST_TABS,
  SORT_ORDERS,
  defaultListFilters,
  filterPosts,
  hasActiveFilters,
  isDraft,
  searchableText,
  snippetOf,
  tabCounts,
  type AccessFilter,
  type ListFilters,
  type PostTab,
  type SortOrder,
} from '@/features/posts/lib/post-list'
import type { OwnerPost } from '@/features/posts/types/post'
import { Link } from '@/i18n/navigation'
import type { ApiError } from '@/lib/api/errors'

type Confirm = { kind: 'delete' | 'unpublish'; post: OwnerPost }

const isOneOf = <T extends string>(
  list: readonly T[],
  value: string
): value is T => (list as readonly string[]).includes(value)

/**
 * The posts page (presentation `PostsView` @ d843c3b): tabs, search,
 * access filter and sort over `GET /content` (FQ-30 (4)), and per-row edit,
 * publish or unpublish and delete (FQ-30 (5)). Not ported (FQ-31): the
 * collections tab, button, filter and cell, the single-post purchase filter
 * and badge; nor the row checkboxes and bulk bar (FQ-30 (5)).
 */
export function PostsManager({ viewerId }: { viewerId: number }) {
  const t = useTranslations('posts')
  const tPanel = useTranslations('panel')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const posts = usePostsQuery(viewerId)
  const status = useSetPostStatusMutation(viewerId)
  const remove = useDeletePostMutation(viewerId)
  const [tab, setTab] = useState<PostTab>('all')
  const [filters, setFilters] = useState<ListFilters>(defaultListFilters)
  // The last target stays while the dialog animates closed.
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const errorText = (error: ApiError) => t(`errors.${postErrorKey(error)}`)

  function publish(post: OwnerPost) {
    status.mutate(statusInput(post, 'publish'), {
      onSuccess: () => toast.success(t('list.publishedToast')),
      onError: (error) => toast.error(errorText(error)),
    })
  }

  function openConfirm(kind: Confirm['kind'], post: OwnerPost) {
    setConfirmError(null)
    setConfirm({ kind, post })
    setConfirmOpen(true)
  }

  function runConfirm() {
    if (!confirm || !confirmOpen) return
    const onError = (error: ApiError) => setConfirmError(errorText(error))
    if (confirm.kind === 'delete') {
      remove.mutate(confirm.post.id, {
        onSuccess: () => {
          setConfirmOpen(false)
          toast.success(t('list.deletedToast'))
        },
        onError,
      })
    } else {
      status.mutate(statusInput(confirm.post, 'draft'), {
        onSuccess: () => {
          setConfirmOpen(false)
          toast.success(t('list.unpublishedToast'))
        },
        onError,
      })
    }
  }

  const createButton = (
    <Button asChild>
      <Link href="/posts/new">
        <SquarePen aria-hidden />
        {t('list.create')}
      </Link>
    </Button>
  )

  let body: ReactNode
  if (posts.data === undefined) {
    // A failed background refetch keeps the list it had.
    body = posts.isError ? (
      <ErrorState
        title={t('list.loadError')}
        description={t(`errors.${postErrorKey(posts.error)}`)}
        action={
          <Button type="button" onClick={() => void posts.refetch()}>
            {tCommon('retry')}
          </Button>
        }
      />
    ) : (
      <p role="status" className="py-12 text-center text-muted-foreground">
        {tCommon('loading')}
      </p>
    )
  } else if (posts.data.length === 0) {
    body = (
      <EmptyState
        icon={<FileTextIcon />}
        title={t('list.empty.title')}
        description={t('list.empty.body')}
        action={
          <Button asChild>
            <Link href="/posts/new">
              <SquarePen aria-hidden />
              {t('list.empty.action')}
            </Link>
          </Button>
        }
      />
    )
  } else {
    const counts = tabCounts(posts.data)
    const shown = filterPosts(posts.data, tab, filters, locale)
    body = (
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isOneOf(POST_TABS, value)) setTab(value)
        }}
        className="gap-5"
      >
        <TabsList
          aria-label={t('list.tabsLabel')}
          className="no-scrollbar h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0"
        >
          {POST_TABS.map((value) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative flex-none rounded-none border-0 px-4 py-2.5 text-body font-normal text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:text-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-foreground"
            >
              {t(`list.tabs.${value}`)}
              <span className="rounded-sm bg-accent px-1.5 py-0.5 text-caption font-semibold">
                {counts[value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        <ListToolbar filters={filters} onChange={setFilters} />
        {POST_TABS.map((value) => (
          <TabsContent key={value} value={value}>
            {shown.length === 0 ? (
              <NoRows
                tab={value}
                filtered={hasActiveFilters(filters)}
                onClear={() => setFilters(defaultListFilters)}
              />
            ) : (
              <PostTable
                posts={shown}
                busy={status.isPending || remove.isPending}
                onPublish={publish}
                onUnpublish={(post) => openConfirm('unpublish', post)}
                onDelete={(post) => openConfirm('delete', post)}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          title={tPanel('pages.posts.title')}
          category={tPanel('pages.posts.category')}
          description={t('list.hint')}
          className="mb-0"
        />
        {createButton}
      </div>
      {body}
      <PostConfirmDialog
        kind={
          confirm?.kind === 'unpublish' ? 'confirmUnpublish' : 'confirmDelete'
        }
        open={confirmOpen}
        title={confirm ? confirm.post.title || t('list.untitled') : ''}
        pending={
          confirm?.kind === 'delete' ? remove.isPending : status.isPending
        }
        error={confirmError}
        onConfirm={runConfirm}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}

function ListToolbar({
  filters,
  onChange,
}: {
  filters: ListFilters
  onChange: (filters: ListFilters) => void
}) {
  const t = useTranslations('posts.list')
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative max-w-md flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted-foreground"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(event) =>
            onChange({ ...filters, query: event.target.value })
          }
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          className="ps-9.5 pe-9"
        />
        {filters.query ? (
          <button
            type="button"
            onClick={() => onChange({ ...filters, query: '' })}
            aria-label={t('clearSearch')}
            className="absolute inset-y-0 end-3 my-auto flex size-5 cursor-pointer items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X aria-hidden className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.access}
          onValueChange={(value) => {
            if (isOneOf<AccessFilter>(ACCESS_FILTERS, value)) {
              onChange({ ...filters, access: value })
            }
          }}
        >
          <SelectTrigger aria-label={t('accessLabel')} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_FILTERS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`access.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.sort}
          onValueChange={(value) => {
            if (isOneOf<SortOrder>(SORT_ORDERS, value)) {
              onChange({ ...filters, sort: value })
            }
          }}
        >
          <SelectTrigger aria-label={t('sortLabel')} className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_ORDERS.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`sort.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasActiveFilters(filters) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-link"
            onClick={() => onChange(defaultListFilters)}
          >
            <RotateCcw aria-hidden />
            {t('clearFilters')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function NoRows({
  tab,
  filtered,
  onClear,
}: {
  tab: PostTab
  filtered: boolean
  onClear: () => void
}) {
  const t = useTranslations('posts.list')
  if (filtered) {
    return (
      <EmptyState
        icon={<Search />}
        title={t('noMatch.title')}
        description={t('noMatch.body')}
        action={
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            {t('noMatch.action')}
          </Button>
        }
      />
    )
  }
  const copy = tab === 'published' ? 'noPublished' : 'noDrafts'
  return (
    <EmptyState
      icon={<FileTextIcon />}
      title={t(`${copy}.title`)}
      description={t(`${copy}.body`)}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/posts/new">{t(`${copy}.action`)}</Link>
        </Button>
      }
    />
  )
}

function PostTable({
  posts,
  busy,
  onPublish,
  onUnpublish,
  onDelete,
}: {
  posts: OwnerPost[]
  busy: boolean
  onPublish: (post: OwnerPost) => void
  onUnpublish: (post: OwnerPost) => void
  onDelete: (post: OwnerPost) => void
}) {
  const t = useTranslations('posts.list')
  const format = useFormatter()

  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-body-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-label text-muted-foreground">
              <th scope="col" className="px-4 py-3.5 text-start font-semibold">
                {t('columns.title')}
              </th>
              <th scope="col" className="px-3 py-3.5 text-start font-semibold">
                {t('columns.access')}
              </th>
              <th scope="col" className="px-3 py-3.5 text-start font-semibold">
                {t('columns.status')}
              </th>
              <th scope="col" className="px-4 py-3.5 text-end font-semibold">
                {t('columns.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {posts.map((post) => {
              const title = post.title || t('untitled')
              const snippet = snippetOf(searchableText(post))
              const editable = isEditableType(post.type)
              return (
                <tr
                  key={post.id}
                  className="transition-colors hover:bg-muted/40"
                >
                  <td className="max-w-xs px-4 py-3.5">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/70 text-muted-foreground">
                        {post.isPublic ? (
                          <Globe
                            aria-hidden
                            className="size-4"
                            strokeWidth={1.7}
                          />
                        ) : (
                          <Lock
                            aria-hidden
                            className="size-4"
                            strokeWidth={1.7}
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        {editable ? (
                          <Link
                            href={`/posts/${post.id}/edit`}
                            dir="auto"
                            className="block max-w-full truncate text-body font-semibold text-foreground transition-colors hover:text-link"
                          >
                            {title}
                          </Link>
                        ) : (
                          <p
                            dir="auto"
                            className="truncate text-body font-semibold text-foreground"
                          >
                            {title}
                          </p>
                        )}
                        {snippet ? (
                          <p
                            dir="auto"
                            className="mt-0.5 truncate text-label text-muted-foreground"
                          >
                            {snippet}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {post.isPublic ? (
                        <Badge variant="money">{t('badge.free')}</Badge>
                      ) : (
                        <Badge variant="violet">{t('badge.tiers')}</Badge>
                      )}
                      {post.paywallPosition !== null ? (
                        <Badge variant="neutral">
                          <Lock aria-hidden />
                          {t('badge.paywall')}
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-3.5 whitespace-nowrap">
                    {post.publishedAt === null ? (
                      <Badge variant="amber">{t('badge.draft')}</Badge>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="neutral">
                          <CheckCircle2
                            aria-hidden
                            className="text-money-600"
                          />
                          {t('badge.published')}
                        </Badge>
                        <time
                          dateTime={post.publishedAt}
                          className="ps-1 text-caption text-muted-foreground"
                        >
                          {format.dateTime(new Date(post.publishedAt), {
                            dateStyle: 'medium',
                          })}
                        </time>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {editable ? (
                        <Button asChild variant="outline" size="sm">
                          <Link
                            href={`/posts/${post.id}/edit`}
                            aria-label={t('editTitle', { title })}
                          >
                            {t('edit')}
                          </Link>
                        </Button>
                      ) : null}
                      {isDraft(post) ? (
                        <Button
                          type="button"
                          variant="inverse"
                          size="sm"
                          disabled={busy}
                          onClick={() => onPublish(post)}
                        >
                          {t('publish')}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => onUnpublish(post)}
                        >
                          {t('unpublish')}
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        onClick={() => onDelete(post)}
                        aria-label={t('deleteNamed', { title })}
                        title={t('delete')}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
