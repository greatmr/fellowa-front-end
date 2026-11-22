'use client'

import { useState, type ReactNode } from 'react'
import {
  CheckCircle2,
  FileTextIcon,
  FolderOpen,
  FolderPlus,
  Globe,
  Lock,
  Plus,
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
import { Checkbox } from '@/components/ui/checkbox'
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
  useBulkPostsMutation,
  useCollectionsQuery,
  useDeleteCollectionMutation,
  useDeletePostMutation,
  usePostsQuery,
  useSetPostStatusMutation,
  type BulkAction,
} from '@/features/posts/api/post-hooks'
import {
  AssignCollectionsDialog,
  type AssignTarget,
} from '@/features/posts/components/assign-collections-dialog'
import {
  BulkBar,
  BulkSummaryNote,
  type BulkRun,
  type BulkSummary,
} from '@/features/posts/components/bulk-bar'
import { CollectionDialog } from '@/features/posts/components/collection-dialog'
import { CollectionsGrid } from '@/features/posts/components/collections-grid'
import {
  PostConfirmDialog,
  type ConfirmKind,
} from '@/features/posts/components/post-confirm-dialog'
import { PostsAliasNotice } from '@/features/posts/components/posts-alias-notice'
import { isEditableType, statusInput } from '@/features/posts/lib/post-draft'
import { postErrorKey } from '@/features/posts/lib/post-errors'
import {
  ACCESS_FILTERS,
  MANAGER_TABS,
  POST_TABS,
  SORT_ORDERS,
  defaultListFilters,
  effectiveFilters,
  filterPosts,
  hasActiveFilters,
  isDraft,
  searchableText,
  snippetOf,
  tabCounts,
  type AccessFilter,
  type CollectionFilter,
  type ListFilters,
  type ManagerTab,
  type PostTab,
  type SortOrder,
} from '@/features/posts/lib/post-list'
import type { OwnerCollection } from '@/features/posts/types/collection'
import type { OwnerPost } from '@/features/posts/types/post'
import { Link } from '@/i18n/navigation'
import type { ApiError } from '@/lib/api/errors'
import { cn } from '@/lib/utils'

type Confirm =
  | { kind: 'delete' | 'unpublish'; post: OwnerPost }
  | { kind: 'bulkDelete' | 'bulkUnpublish'; posts: OwnerPost[] }
  | { kind: 'deleteCollection'; collection: OwnerCollection }

/** A dialog's target; `nonce` remounts it so its form starts fresh. */
type Opened<T> = { target: T; open: boolean; nonce: number }

const isOneOf = <T extends string>(
  list: readonly T[],
  value: string
): value is T => (list as readonly string[]).includes(value)

const confirmKinds: Record<Confirm['kind'], ConfirmKind> = {
  delete: 'confirmDelete',
  unpublish: 'confirmUnpublish',
  bulkDelete: 'bulk.confirmDelete',
  bulkUnpublish: 'bulk.confirmUnpublish',
  deleteCollection: 'collections.confirmDelete',
}

/**
 * The posts page (presentation `PostsView` @ d843c3b): tabs (all,
 * published, drafts, collections), search, access and collection filters
 * and sort over `GET /content` (FQ-30 (4)), per-row edit, publish or
 * unpublish, delete and collections, and the row checkboxes with the bulk
 * bar (FQ-30 (5), reversed 2026-11-22). Collections (FQ-35, BE-CONT-15):
 * the grid, its dialogs and the active-collection banner. Not ported
 * (FQ-31): the single-post purchase filter and badge; the tier name on the
 * access badge (no owner read names a post's tiers).
 */
export function PostsManager({ viewerId }: { viewerId: number }) {
  const t = useTranslations('posts')
  const tPanel = useTranslations('panel')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const posts = usePostsQuery(viewerId)
  const collections = useCollectionsQuery(viewerId)
  const status = useSetPostStatusMutation(viewerId)
  const remove = useDeletePostMutation(viewerId)
  const removeCollection = useDeleteCollectionMutation(viewerId)
  const bulk = useBulkPostsMutation(viewerId)
  const [tab, setTab] = useState<ManagerTab>('all')
  const [filters, setFilters] = useState<ListFilters>(defaultListFilters)
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
    () => new Set()
  )
  const [run, setRun] = useState<BulkRun | null>(null)
  const [summary, setSummary] = useState<BulkSummary | null>(null)
  const [noPage, setNoPage] = useState(false)
  // The last target stays while the dialog animates closed.
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [assign, setAssign] = useState<Opened<AssignTarget> | null>(null)
  const [editing, setEditing] = useState<Opened<OwnerCollection | null> | null>(
    null
  )

  const errorText = (error: ApiError) => t(`errors.${postErrorKey(error)}`)
  const titleOf = (post: OwnerPost) => post.title || t('list.untitled')
  const running = run !== null

  const collectionList = collections.data ?? []
  const effective = effectiveFilters(
    filters,
    collectionList.map((collection) => collection.id)
  )
  const activeCollection =
    typeof effective.collection === 'number'
      ? collectionList.find((c) => c.id === effective.collection)
      : undefined
  const postTab: PostTab | null = tab === 'collections' ? null : tab
  const shown =
    posts.data && postTab
      ? filterPosts(posts.data, postTab, effective, locale)
      : []
  // Only rows on screen are acted on; a post filtered out stays untouched.
  const selected = shown.filter((post) => selectedIds.has(post.id))

  function changeTab(next: ManagerTab) {
    setTab(next)
    setSelectedIds(new Set())
  }

  function toggleRow(postId: number, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) next.add(postId)
      else next.delete(postId)
      return next
    })
  }

  function toggleAll(checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current)
      for (const post of shown) {
        if (checked) next.add(post.id)
        else next.delete(post.id)
      }
      return next
    })
  }

  function publish(post: OwnerPost) {
    status.mutate(statusInput(post, 'publish'), {
      onSuccess: () => toast.success(t('list.publishedToast')),
      onError: (error) => toast.error(errorText(error)),
    })
  }

  function openConfirm(next: Confirm) {
    setConfirmError(null)
    setConfirm(next)
    setConfirmOpen(true)
  }

  function runBulkAction(action: BulkAction, targets: OwnerPost[]) {
    if (targets.length === 0 || running) return
    setSummary(null)
    setRun({ action, done: 0, total: targets.length })
    bulk.mutate(
      {
        action,
        posts: targets,
        onProgress: (progress) => setRun({ action, ...progress }),
      },
      {
        onSuccess: (outcomes) => {
          const failures = outcomes.filter((o) => o.error !== null)
          const failedIds = new Set(failures.map((o) => o.item.id))
          // The posts that went through leave the selection; the failed
          // stay, even if a tab change cleared it during the run.
          setSelectedIds((current) => {
            const next = new Set(current)
            for (const post of targets) {
              if (failedIds.has(post.id)) next.add(post.id)
              else next.delete(post.id)
            }
            return next
          })
          if (failures.length === 0) {
            toast.success(
              t(`bulk.doneToast.${action}`, { count: targets.length })
            )
          } else {
            setSummary({
              action,
              total: targets.length,
              failures: failures.map((o) => ({
                id: o.item.id,
                title: titleOf(o.item),
                reason: o.error ? errorText(o.error) : '',
              })),
            })
          }
        },
        onSettled: () => setRun(null),
      }
    )
  }

  function runConfirm() {
    if (!confirm || !confirmOpen) return
    const onError = (error: ApiError) => setConfirmError(errorText(error))
    switch (confirm.kind) {
      case 'delete':
        remove.mutate(confirm.post.id, {
          onSuccess: () => {
            setConfirmOpen(false)
            toast.success(t('list.deletedToast'))
          },
          onError,
        })
        return
      case 'unpublish':
        status.mutate(statusInput(confirm.post, 'draft'), {
          onSuccess: () => {
            setConfirmOpen(false)
            toast.success(t('list.unpublishedToast'))
          },
          onError,
        })
        return
      case 'bulkDelete':
      case 'bulkUnpublish':
        // The run reports itself in the bar; the dialog is done.
        setConfirmOpen(false)
        runBulkAction(
          confirm.kind === 'bulkDelete' ? 'delete' : 'draft',
          confirm.posts
        )
        return
      case 'deleteCollection': {
        const { collection } = confirm
        removeCollection.mutate(collection.id, {
          onSuccess: () => {
            setConfirmOpen(false)
            setFilters((current) =>
              current.collection === collection.id
                ? { ...current, collection: 'all' }
                : current
            )
            toast.success(
              t('collections.deletedToast', { title: collection.title })
            )
          },
          onError,
        })
      }
    }
  }

  function openAssign(target: AssignTarget) {
    setAssign((current) => ({
      target,
      open: true,
      nonce: (current?.nonce ?? 0) + 1,
    }))
  }

  function openCollection(collection: OwnerCollection | null) {
    setEditing((current) => ({
      target: collection,
      open: true,
      nonce: (current?.nonce ?? 0) + 1,
    }))
  }

  function viewCollection(collection: OwnerCollection) {
    setFilters((current) => ({ ...current, collection: collection.id }))
    changeTab('all')
  }

  const postsEmpty = posts.data?.length === 0
  const collectionsEmpty = collections.data?.length === 0
  const onCollections = tab === 'collections'

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <PageHeader
        title={tPanel('pages.posts.title')}
        category={tPanel('pages.posts.category')}
        description={t('list.hint')}
        className="mb-0"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={onCollections && !collectionsEmpty ? 'default' : 'outline'}
          onClick={() => openCollection(null)}
        >
          <FolderPlus aria-hidden />
          {t('list.createCollection')}
        </Button>
        <Button
          asChild
          variant={
            onCollections || (postTab !== null && postsEmpty)
              ? 'inverse'
              : 'default'
          }
        >
          <Link href="/posts/new">
            <SquarePen aria-hidden />
            {t('list.create')}
          </Link>
        </Button>
      </div>
    </div>
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
  } else {
    const counts = tabCounts(posts.data)
    const tabCount = (value: ManagerTab): number | null =>
      value === 'collections'
        ? (collections.data?.length ?? null)
        : counts[value]
    const allPosts = posts.data
    const rowsBusy =
      running || status.isPending || remove.isPending || bulk.isPending

    body = (
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (isOneOf(MANAGER_TABS, value)) changeTab(value)
        }}
        className="gap-5"
      >
        <TabsList
          aria-label={t('list.tabsLabel')}
          className="no-scrollbar h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0"
        >
          {MANAGER_TABS.map((value) => {
            const count = tabCount(value)
            return (
              <TabsTrigger
                key={value}
                value={value}
                className="relative flex-none rounded-none border-0 px-4 py-2.5 text-body font-normal text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 hover:text-foreground data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-foreground"
              >
                {t(`list.tabs.${value}`)}
                {count === null ? null : (
                  <span className="rounded-sm bg-accent px-1.5 py-0.5 text-caption font-semibold">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="collections">
          <CollectionsGrid
            collections={collections.data}
            loadFailed={collections.isError}
            onRetry={() => void collections.refetch()}
            noPosts={postsEmpty}
            busy={removeCollection.isPending}
            onCreate={() => openCollection(null)}
            onEdit={openCollection}
            onDelete={(collection) =>
              openConfirm({ kind: 'deleteCollection', collection })
            }
            onView={viewCollection}
          />
        </TabsContent>

        {POST_TABS.map((value) => (
          <TabsContent key={value} value={value} className="grid gap-4">
            {allPosts.length === 0 ? (
              <EmptyState
                icon={<FileTextIcon />}
                title={t('list.empty.title')}
                description={t('list.empty.body')}
                action={
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <Button asChild>
                      <Link href="/posts/new">
                        <SquarePen aria-hidden />
                        {t('list.empty.action')}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => changeTab('collections')}
                    >
                      <FolderPlus aria-hidden />
                      {t('list.empty.manageCollections')}
                    </Button>
                  </div>
                }
              />
            ) : (
              <>
                <ListToolbar
                  filters={effective}
                  collections={collectionList}
                  onChange={setFilters}
                />
                {activeCollection ? (
                  <CollectionBanner
                    title={activeCollection.title}
                    onAddPosts={() => openCollection(activeCollection)}
                    onClear={() =>
                      setFilters((current) => ({
                        ...current,
                        collection: 'all',
                      }))
                    }
                  />
                ) : null}
                {summary ? (
                  <BulkSummaryNote
                    summary={summary}
                    onDismiss={() => setSummary(null)}
                  />
                ) : null}
                {selected.length > 0 || running ? (
                  <BulkBar
                    count={run?.total ?? selected.length}
                    canPublish={selected.some(isDraft)}
                    canDraft={selected.some((post) => !isDraft(post))}
                    run={run}
                    onAddToCollection={() =>
                      openAssign({ mode: 'add', posts: selected })
                    }
                    onPublish={() =>
                      runBulkAction('publish', selected.filter(isDraft))
                    }
                    onDraft={() =>
                      openConfirm({
                        kind: 'bulkUnpublish',
                        posts: selected.filter((post) => !isDraft(post)),
                      })
                    }
                    onDelete={() =>
                      openConfirm({ kind: 'bulkDelete', posts: selected })
                    }
                    onCancel={() => setSelectedIds(new Set())}
                  />
                ) : null}
                {shown.length === 0 ? (
                  <NoRows
                    tab={value}
                    filtered={hasActiveFilters(effective)}
                    onClear={() => setFilters(defaultListFilters)}
                  />
                ) : (
                  <PostTable
                    posts={shown}
                    collections={collectionList}
                    selectedIds={selectedIds}
                    busy={rowsBusy}
                    onToggle={toggleRow}
                    onToggleAll={toggleAll}
                    onPublish={publish}
                    onUnpublish={(post) =>
                      openConfirm({ kind: 'unpublish', post })
                    }
                    onDelete={(post) => openConfirm({ kind: 'delete', post })}
                    onCollections={(post) =>
                      openAssign({ mode: 'replace', post })
                    }
                  />
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    )
  }

  const confirmPending =
    confirm?.kind === 'delete'
      ? remove.isPending
      : confirm?.kind === 'unpublish'
        ? status.isPending
        : confirm?.kind === 'deleteCollection'
          ? removeCollection.isPending
          : false

  return (
    <div className="space-y-6">
      {header}
      {noPage ? <PostsAliasNotice /> : null}
      {body}
      <PostConfirmDialog
        kind={confirmKinds[confirm?.kind ?? 'delete']}
        open={confirmOpen}
        values={confirmValues(confirm, titleOf)}
        pending={confirmPending}
        error={confirmError}
        onConfirm={runConfirm}
        onClose={() => setConfirmOpen(false)}
      />
      {assign ? (
        <AssignCollectionsDialog
          key={assign.nonce}
          viewerId={viewerId}
          open={assign.open}
          target={assign.target}
          onClose={() =>
            setAssign((current) => current && { ...current, open: false })
          }
          onAdded={(postIds) =>
            setSelectedIds((current) => {
              const next = new Set(current)
              for (const id of postIds) next.delete(id)
              return next
            })
          }
          onNoPage={() => setNoPage(true)}
        />
      ) : null}
      {editing ? (
        <CollectionDialog
          key={editing.nonce}
          viewerId={viewerId}
          open={editing.open}
          collection={editing.target}
          posts={posts.data ?? []}
          onClose={() =>
            setEditing((current) => current && { ...current, open: false })
          }
          onNoPage={() => setNoPage(true)}
        />
      ) : null}
    </div>
  )
}

function confirmValues(
  confirm: Confirm | null,
  titleOf: (post: OwnerPost) => string
): { title?: string; count?: number } {
  if (!confirm) return {}
  switch (confirm.kind) {
    case 'bulkDelete':
    case 'bulkUnpublish':
      return { count: confirm.posts.length }
    case 'deleteCollection':
      return { title: confirm.collection.title }
    default:
      return { title: titleOf(confirm.post) }
  }
}

function CollectionBanner({
  title,
  onAddPosts,
  onClear,
}: {
  title: string
  onAddPosts: () => void
  onClear: () => void
}) {
  const t = useTranslations('posts.list.banner')
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-2.5 text-label">
      <p className="flex items-center gap-2 text-foreground">
        <FolderOpen aria-hidden className="size-4 text-muted-foreground" />
        <span>
          {t.rich('showing', {
            title,
            b: (chunks) => (
              <bdi className="font-semibold text-foreground">{chunks}</bdi>
            ),
          })}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onAddPosts}>
          {t('addPosts')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={t('clear')}
          title={t('clear')}
          onClick={onClear}
        >
          <X aria-hidden />
        </Button>
      </div>
    </div>
  )
}

function collectionValue(filter: CollectionFilter): string {
  return typeof filter === 'number' ? String(filter) : filter
}

function ListToolbar({
  filters,
  collections,
  onChange,
}: {
  filters: ListFilters
  collections: OwnerCollection[]
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
          value={collectionValue(filters.collection)}
          onValueChange={(value) => {
            const collection: CollectionFilter =
              value === 'all' || value === 'none' ? value : Number(value)
            onChange({ ...filters, collection })
          }}
        >
          <SelectTrigger aria-label={t('collectionLabel')} className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('collection.all')}</SelectItem>
            <SelectItem value="none">{t('collection.none')}</SelectItem>
            {collections.map((collection) => (
              <SelectItem key={collection.id} value={String(collection.id)}>
                <bdi>{collection.title}</bdi>
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
  collections,
  selectedIds,
  busy,
  onToggle,
  onToggleAll,
  onPublish,
  onUnpublish,
  onDelete,
  onCollections,
}: {
  posts: OwnerPost[]
  collections: OwnerCollection[]
  selectedIds: ReadonlySet<number>
  busy: boolean
  onToggle: (postId: number, checked: boolean) => void
  onToggleAll: (checked: boolean) => void
  onPublish: (post: OwnerPost) => void
  onUnpublish: (post: OwnerPost) => void
  onDelete: (post: OwnerPost) => void
  onCollections: (post: OwnerPost) => void
}) {
  const t = useTranslations('posts.list')
  const format = useFormatter()
  const byId = new Map(collections.map((c) => [c.id, c]))
  const selectedCount = posts.filter((post) => selectedIds.has(post.id)).length
  const allState =
    selectedCount === 0
      ? false
      : selectedCount === posts.length
        ? true
        : 'indeterminate'

  return (
    <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-start text-body-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-label text-muted-foreground">
              <th scope="col" className="w-11 px-4 py-3.5 text-start">
                <span className="sr-only">{t('columns.select')}</span>
                <Checkbox
                  checked={allState}
                  disabled={busy}
                  aria-label={t('selectAll')}
                  onCheckedChange={(checked) => onToggleAll(checked === true)}
                />
              </th>
              <th scope="col" className="px-3 py-3.5 text-start font-semibold">
                {t('columns.title')}
              </th>
              <th scope="col" className="px-3 py-3.5 text-start font-semibold">
                {t('columns.access')}
              </th>
              <th scope="col" className="px-3 py-3.5 text-start font-semibold">
                {t('columns.collections')}
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
              const isSelected = selectedIds.has(post.id)
              const inCollections = post.collectionIds.flatMap((id) => {
                const collection = byId.get(id)
                return collection ? [collection] : []
              })
              return (
                <tr
                  key={post.id}
                  className={cn(
                    'transition-colors',
                    isSelected ? 'bg-accent' : 'hover:bg-muted/40'
                  )}
                >
                  <td className="px-4 py-3.5 align-middle">
                    <Checkbox
                      checked={isSelected}
                      disabled={busy}
                      aria-label={t('selectRow', { title })}
                      onCheckedChange={(checked) =>
                        onToggle(post.id, checked === true)
                      }
                    />
                  </td>
                  <td className="max-w-xs px-3 py-3.5">
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
                  <td className="px-3 py-3.5">
                    <div className="flex min-w-36 flex-wrap items-center gap-1.5">
                      {inCollections.map((collection) => (
                        <span
                          key={collection.id}
                          dir="auto"
                          className="inline-flex max-w-40 items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-caption font-semibold text-foreground"
                        >
                          <FolderOpen
                            aria-hidden
                            className="size-3 shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{collection.title}</span>
                        </span>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onCollections(post)}
                        aria-label={
                          inCollections.length > 0
                            ? t('cell.changeNamed', { title })
                            : t('cell.addNamed', { title })
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-sm border border-dashed px-2 py-0.5 text-caption font-medium text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Plus aria-hidden className="size-3" />
                        {inCollections.length > 0
                          ? t('cell.change')
                          : t('cell.add')}
                      </button>
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
