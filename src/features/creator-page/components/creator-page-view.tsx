import {
  CheckIcon,
  ExternalLinkIcon,
  FileTextIcon,
  FolderOpen,
  GemIcon,
  HeartIcon,
  InfoIcon,
  SparklesIcon,
} from 'lucide-react'
import Image from 'next/image'
import { useFormatter, useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Money } from '@/components/common/money'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CopyLinkButton } from '@/features/creator-page/components/copy-link-button'
import { CreatorCollections } from '@/features/creator-page/components/creator-collections'
import { CreatorPostList } from '@/features/creator-page/components/creator-post-list'
import { CreatorStickyHeader } from '@/features/creator-page/components/creator-sticky-header'
import {
  CreatorTabs,
  CreatorTabsProvider,
  MiniTabs,
  OpenTabButton,
} from '@/features/creator-page/components/creator-tabs'
import { FollowButton } from '@/features/creator-page/components/follow-button'
import type {
  CreatorPageData,
  CreatorPageViewer,
} from '@/features/creator-page/server/load-creator-page'
import {
  CREATOR_TABS_ID,
  type CreatorPageTab,
  creatorPageTabs,
} from '@/features/creator-page/lib/tabs'
import type { CreatorTier } from '@/features/creator-page/types/creator-page'
import { PublishButton, PublishPageProvider } from '@/features/dashboard'
import { Link } from '@/i18n/navigation'
import { publicPageTitle } from '@/lib/page-name'

const HERO_ID = 'creator-page-hero'

/**
 * Public creator page (FE-PAGE-01/02/03; presentation `CreatorProfileView`
 * @ d843c3b, FQ-32 defaults): sticky scroll header, owner preview bar, cover
 * and identity, follower and post chips, tabs Posts · Tiers · About, in one
 * column at the public page width. Posts come from the public list (Q-51):
 * FULL, PARTIAL or TEASER as the server decided, the same for every viewer
 * (FQ-33 A). Collections (FQ-35, BE-CONT-15) are a tab of their own when
 * the creator has any: beyond the design, in the page's own patterns. The
 * owner view is display only; the backend refuses
 * self-interaction. `ownPage` is the owner's preview at `/creator`
 * (BE-LAND-10): the lists read the owner's routes, and until the page is
 * published the bar offers publishing instead of the link to share, and posts
 * open in the editor (their public pages are 404 until then). Not ported: the support widget with goal, tips and
 * crypto (FQ-2/3/31), member counts (none is public), "most popular" and
 * trial (FQ-12/11), single-post purchase, the avatar shuffle, likes and
 * comments, and the bio's "read more" (the whole bio is shown).
 */
export function CreatorPageView({
  profile,
  tiers,
  posts,
  collections,
  categoryTitle,
  viewer,
  pageUrl,
  ownPage,
  initialTab = 'posts',
}: CreatorPageData & { initialTab?: CreatorPageTab }) {
  const t = useTranslations('creatorPage')
  const format = useFormatter()
  const title = publicPageTitle(profile)
  const name = title?.name ?? t('unnamed')
  const initial = title?.initial ?? name.slice(0, 1)
  const showAlias = Boolean(title && !title.isAlias && profile.alias)
  const following = profile.viewerFollows ?? false
  // The Collections tab only when there is something to open (FQ-35; an
  // addition beyond the design, which has none).
  const shownCollections =
    collections !== null && collections.length > 0 ? collections : null
  const visibleTabs = creatorPageTabs.filter(
    (tab) => tab !== 'collections' || shownCollections !== null
  )
  const startTab = visibleTabs.includes(initialTab) ? initialTab : 'posts'
  const author = { name, initial, avatarUrl: profile.avatarUrl }
  const listSource = ownPage ? 'ownPage' : 'public'
  const unpublished = ownPage?.isPublished === false
  const postLink = unpublished ? 'editor' : 'reader'

  const tabLabels: Record<CreatorPageTab, string> = {
    posts:
      posts === null
        ? t('tabs.posts')
        : t('tabs.withCount', {
            label: t('tabs.posts'),
            count: format.number(posts.total),
          }),
    tiers:
      tiers === null
        ? t('tabs.tiers')
        : t('tabs.withCount', {
            label: t('tabs.tiers'),
            count: format.number(tiers.length),
          }),
    collections:
      shownCollections === null
        ? t('tabs.collections')
        : t('tabs.withCount', {
            label: t('tabs.collections'),
            count: format.number(shownCollections.length),
          }),
    about: t('tabs.about'),
  }

  return (
    <CreatorTabsProvider initialTab={startTab}>
      <CreatorStickyHeader
        watchId={HERO_ID}
        identity={
          <div className="flex min-w-0 items-center gap-3">
            <CreatorAvatar
              url={profile.avatarUrl}
              initial={initial}
              className="size-10 shrink-0 ring-2 ring-primary/20"
            />
            <div className="grid min-w-0">
              <span className="truncate text-body-sm font-bold text-foreground">
                <bdi>{name}</bdi>
              </span>
              <span className="truncate text-label text-muted-foreground">
                {showAlias ? (
                  <>
                    <bdi dir="ltr">@{profile.alias}</bdi>
                    <span aria-hidden> · </span>
                  </>
                ) : null}
                {t('stickySubtitle', {
                  count: profile.followerCount,
                  formatted: format.number(profile.followerCount),
                })}
              </span>
            </div>
          </div>
        }
        tabs={
          <MiniTabs
            tabs={visibleTabs}
            labels={tabLabels}
            className="hidden items-center gap-1 rounded-md bg-muted p-1 sm:flex"
          />
        }
        actions={
          <>
            {/* Nothing to share before publication: the link is a 404. */}
            {unpublished ? null : (
              <CopyLinkButton
                url={pageUrl}
                label={t('copyLink')}
                iconOnly
                size="icon-sm"
              />
            )}
            <CreatorActions
              creatorId={profile.id}
              viewer={viewer}
              following={following}
              compact
            />
          </>
        }
      />

      <article>
        {viewer !== 'owner' ? null : unpublished ? (
          <UnpublishedOwnerBar
            creatorId={profile.id}
            hasNoTier={tiers !== null && tiers.length === 0}
          />
        ) : (
          <OwnerBar pageUrl={pageUrl} />
        )}

        <div id={HERO_ID}>
          <div
            aria-hidden
            className="relative h-48 w-full overflow-hidden rounded-card bg-cover-mix bg-cover bg-center sm:h-60"
            style={
              profile.coverUrl
                ? {
                    backgroundImage: `url(${JSON.stringify(profile.coverUrl)})`,
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
          </div>

          <header className="relative -mt-14 px-1 sm:-mt-16 sm:px-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <CreatorAvatar
                url={profile.avatarUrl}
                initial={initial}
                className="mx-auto size-28 bg-card shadow-md ring-4 ring-background sm:mx-0 sm:size-32"
                fallbackClassName="text-headline font-bold"
              />
              {/* The owner's copy and edit are in the preview bar above. */}
              {viewer === 'owner' ? null : (
                <div className="flex flex-wrap items-center justify-center gap-2 pb-1 sm:justify-end">
                  <CopyLinkButton
                    url={pageUrl}
                    label={t('share')}
                    variant="ghost"
                    size="sm"
                    className="border"
                  />
                  <CreatorActions
                    creatorId={profile.id}
                    viewer={viewer}
                    following={following}
                  />
                </div>
              )}
            </div>

            <div className="mt-3.5 text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                <h1 className="text-headline font-black tracking-tight text-foreground">
                  <bdi>{name}</bdi>
                </h1>
                {categoryTitle ? (
                  <Badge variant="violet">{categoryTitle}</Badge>
                ) : null}
              </div>
              {showAlias ? (
                <p className="mt-1 text-label font-medium text-muted-foreground">
                  <bdi dir="ltr">@{profile.alias}</bdi>
                </p>
              ) : null}
              {profile.bio ? (
                <p
                  dir="auto"
                  className="mx-auto mt-3 max-w-2xl text-body leading-relaxed whitespace-pre-line text-foreground sm:mx-0"
                >
                  {profile.bio}
                </p>
              ) : null}
            </div>
          </header>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2.5 border-y py-3.5">
          <StatChip>
            {t.rich('followers', {
              count: profile.followerCount,
              formatted: format.number(profile.followerCount),
              b: (chunks) => <b className="font-semibold">{chunks}</b>,
            })}
          </StatChip>
          {posts === null ? null : (
            <StatChip>
              {t.rich('postsCount', {
                count: posts.total,
                formatted: format.number(posts.total),
                b: (chunks) => <b className="font-semibold">{chunks}</b>,
              })}
            </StatChip>
          )}
        </div>

        <CreatorTabs className="mt-6 gap-0">
          <div id={CREATOR_TABS_ID} className="scroll-mt-20">
            <TabsList
              aria-label={t('tabsLabel')}
              className="no-scrollbar h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0"
            >
              <UnderlineTab
                value="posts"
                icon={<FileTextIcon aria-hidden />}
                label={t('tabs.posts')}
                count={posts === null ? null : format.number(posts.total)}
              />
              {shownCollections === null ? null : (
                <UnderlineTab
                  value="collections"
                  icon={<FolderOpen aria-hidden />}
                  label={t('tabs.collections')}
                  count={format.number(shownCollections.length)}
                />
              )}
              <UnderlineTab
                value="tiers"
                icon={<SparklesIcon aria-hidden />}
                label={t('tabs.tiers')}
                count={tiers === null ? null : format.number(tiers.length)}
              />
              <UnderlineTab
                value="about"
                icon={<InfoIcon aria-hidden />}
                label={t('tabs.about')}
                count={null}
              />
            </TabsList>
          </div>

          {/* Kept mounted (the list is public, so hiding it gates nothing):
              returning to Posts keeps the filter and the pages loaded. */}
          <TabsContent
            value="posts"
            forceMount
            className="mt-8 data-[state=inactive]:hidden"
          >
            {posts === null ? (
              <ErrorState title={t('postsUnavailable')} />
            ) : (
              <CreatorPostList
                creatorId={profile.id}
                firstPage={posts}
                author={author}
                source={listSource}
                postLink={postLink}
              />
            )}
          </TabsContent>

          {shownCollections === null ? null : (
            <TabsContent value="collections" className="mt-8">
              <CreatorCollections
                creatorId={profile.id}
                collections={shownCollections}
                author={author}
                source={listSource}
                postLink={postLink}
              />
            </TabsContent>
          )}

          <TabsContent value="tiers" className="mt-8 grid gap-6">
            <div>
              <h2 className="text-title-sm font-black text-foreground">
                {t('tiersHeading')}
              </h2>
              <p className="mt-1 text-label leading-relaxed text-muted-foreground">
                {t('tiersIntro', { name })}
              </p>
            </div>
            {tiers === null ? (
              <ErrorState title={t('tiersUnavailable')} />
            ) : tiers.length === 0 ? (
              <EmptyState icon={<GemIcon />} title={t('emptyTiers')} />
            ) : (
              <>
                {viewer === 'owner' ? null : (
                  <p
                    id="creator-join-soon"
                    className="text-label text-muted-foreground"
                  >
                    {t('comingSoon')}
                  </p>
                )}
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tiers.map((tier) => (
                    <li key={tier.id} className="flex">
                      <TierCard tier={tier} viewer={viewer} />
                    </li>
                  ))}
                </ul>
              </>
            )}
          </TabsContent>

          <TabsContent value="about" className="mt-8">
            {profile.bio || profile.links.length > 0 ? (
              <Card className="gap-0 p-6">
                <h2 className="text-title-sm font-black text-foreground">
                  {t('aboutHeading')}
                </h2>
                {profile.bio ? (
                  <p
                    dir="auto"
                    className="mt-3 text-body leading-8 whitespace-pre-line text-foreground"
                  >
                    {profile.bio}
                  </p>
                ) : null}
                {profile.links.length > 0 ? (
                  <div className="mt-6 border-t pt-6">
                    <h3 className="mb-3 text-body-sm font-bold text-foreground">
                      {t('linksHeading')}
                    </h3>
                    <ul className="flex flex-wrap gap-2.5">
                      {profile.links.map((link) => (
                        <li key={link.kind}>
                          <Button asChild variant="outline" size="sm">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow ugc"
                            >
                              {t(`links.${link.kind}`)}
                              <ExternalLinkIcon
                                aria-hidden
                                className="size-3.5"
                              />
                            </a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            ) : (
              <EmptyState icon={<InfoIcon />} title={t('emptyAbout')} />
            )}
          </TabsContent>
        </CreatorTabs>
      </article>
    </CreatorTabsProvider>
  )
}

function CreatorAvatar({
  url,
  initial,
  className,
  fallbackClassName = 'text-label font-bold',
}: {
  url: string | null
  initial: string
  className?: string
  fallbackClassName?: string
}) {
  return (
    <Avatar className={className}>
      {url ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback className={fallbackClassName}>{initial}</AvatarFallback>
    </Avatar>
  )
}

function StatChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-3 py-1.5 text-label font-medium text-foreground">
      {children}
    </span>
  )
}

function UnderlineTab({
  value,
  icon,
  label,
  count,
}: {
  value: CreatorPageTab
  icon: React.ReactNode
  label: string
  count: string | null
}) {
  return (
    <TabsTrigger
      value={value}
      className="h-auto flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-5 pt-2 pb-1.5 text-body-sm font-normal text-muted-foreground hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none"
    >
      {icon}
      <span>{label}</span>
      {count === null ? null : (
        <span className="rounded-full bg-muted px-2 py-0.5 text-label text-muted-foreground">
          {count}
        </span>
      )}
    </TabsTrigger>
  )
}

/**
 * The owner's preview bar (presentation :537-573): this is how supporters
 * see the page, with copy link and edit page (→ `/settings`, where the page
 * name is edited). Display only; no avatar shuffle.
 */
function OwnerBar({ pageUrl }: { pageUrl: string | null }) {
  const t = useTranslations('creatorPage')

  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-brand-200/70 bg-brand-50 px-5 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full bg-brand-500 motion-safe:animate-pulse"
        />
        <p className="text-label font-medium text-brand-900 dark:text-brand-200">
          {t('ownerNotice')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <CopyLinkButton
          url={pageUrl}
          label={t('copyPageLink')}
          variant="ghost"
          size="sm"
          className="bg-card shadow-xs"
        />
        <Button asChild size="sm">
          <Link href="/settings">{t('editPage')}</Link>
        </Button>
      </div>
    </div>
  )
}

/**
 * The owner's bar on the preview of an unpublished page (`/creator`, owner
 * decision 2026-11-22): the page as visitors will see it, "not published
 * yet", and the dashboard's one publish action (FE-STUDIO-03's provider, so
 * a single request and pending state; it refreshes the page on success,
 * which then shows the published bar). Held back with its reason while the
 * page has no active tier (CP-05), as on the dashboard (`/tire` and
 * `me/page/tiers` both list active tiers only); a page here always has a
 * username, or the preview would not exist.
 */
function UnpublishedOwnerBar({
  creatorId,
  hasNoTier,
}: {
  creatorId: number
  hasNoTier: boolean
}) {
  const t = useTranslations('creatorPage')
  const tDashboard = useTranslations('panel.dashboard')

  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 rounded-md border border-warning-border bg-warning-subtle px-5 py-3">
      <div className="flex items-center gap-2.5 self-center">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full bg-warning"
        />
        <p className="text-label font-medium text-foreground">
          {t('unpublishedNotice')}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-2">
        <Button asChild size="sm" variant="outline" className="bg-card">
          <Link href="/settings">{t('editPage')}</Link>
        </Button>
        <PublishPageProvider viewerId={creatorId}>
          <PublishButton
            withIcon
            blockedReason={hasNoTier ? tDashboard('publishNeedsTier') : null}
          />
        </PublishPageProvider>
      </div>
    </div>
  )
}

function signInHref(creatorId: number) {
  return {
    pathname: '/auth',
    query: { returnTo: `/creators/${creatorId}` },
  } as const
}

/**
 * Follow and Support / Join. Owner → edit page. Anonymous → Follow signs in
 * and comes back. Signed in → a working Follow (FE-PAGE-02). Support / Join
 * opens the Tiers tab for every visitor, where joining waits for checkout
 * (FE-PAY-01). `compact` is the sticky header's version: Follow only from
 * `sm` up.
 */
function CreatorActions({
  creatorId,
  viewer,
  following,
  compact = false,
}: {
  creatorId: number
  viewer: CreatorPageViewer
  following: boolean
  compact?: boolean
}) {
  const t = useTranslations('creatorPage')

  if (viewer === 'owner') {
    return (
      <Button asChild size="sm">
        <Link href="/settings">{t('editPage')}</Link>
      </Button>
    )
  }
  return (
    <>
      <div className={compact ? 'hidden sm:block' : undefined}>
        {viewer === 'anonymous' ? (
          <Button asChild variant="outline" size="sm">
            <Link href={signInHref(creatorId)}>{t('follow')}</Link>
          </Button>
        ) : (
          <FollowButton creatorId={creatorId} following={following} />
        )}
      </div>
      <OpenTabButton tab="tiers" size="sm">
        <HeartIcon aria-hidden className="fill-current" />
        {t('support')}
      </OpenTabButton>
    </>
  )
}

/**
 * One tier (presentation :1050-1106) without badge, trial or supporters.
 * Join stays disabled for every visitor until checkout exists (FE-PAY-01,
 * FQ-32 item 6).
 */
function TierCard({
  tier,
  viewer,
}: {
  tier: CreatorTier
  viewer: CreatorPageViewer
}) {
  const t = useTranslations('creatorPage')

  return (
    <Card className="flex-1 gap-0 overflow-hidden p-0">
      {tier.coverUrl ? (
        // No allowed host in `images.remotePatterns` yet: unoptimized, as
        // the creator's own pages render the same URLs.
        <Image
          src={tier.coverUrl}
          alt={t('tierCoverAlt', { title: tier.title })}
          width={640}
          height={256}
          unoptimized
          className="h-32 w-full object-cover"
        />
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        <h3 dir="auto" className="text-subtitle font-bold text-foreground">
          {tier.title}
        </h3>
        <p className="mt-2 flex items-baseline gap-1">
          <span className="numeric text-title font-black text-foreground">
            <Money
              amountToman={tier.priceToman}
              unitClassName="text-body font-medium text-muted-foreground"
            />
          </span>
          <span className="text-label font-medium text-muted-foreground">
            {t('perMonth')}
          </span>
        </p>
        {tier.description ? (
          <p
            dir="auto"
            className="mt-2 text-body-sm leading-6 text-muted-foreground"
          >
            {tier.description}
          </p>
        ) : null}
        <div aria-hidden className="my-4 h-px bg-border" />
        {tier.benefits.length > 0 ? (
          <ul className="grid flex-1 content-start gap-2 text-label leading-relaxed text-foreground">
            {tier.benefits.map((benefit) => (
              <li key={benefit.id} className="flex items-start gap-2">
                <CheckIcon
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0 text-primary"
                />
                <span dir="auto">{benefit.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex-1" />
        )}
        {viewer === 'owner' ? null : (
          <Button
            variant="outline"
            className="mt-4 w-full"
            disabled
            aria-describedby="creator-join-soon"
          >
            {t('joinTier')}
          </Button>
        )}
      </div>
    </Card>
  )
}
