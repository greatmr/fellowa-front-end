import { ExternalLinkIcon, FileTextIcon, GemIcon, InfoIcon } from 'lucide-react'
import { useFormatter, useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Money } from '@/components/common/money'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  CreatorPageData,
  CreatorPageViewer,
} from '@/features/creator-page/server/load-creator-page'
import { FollowButton } from '@/features/creator-page/components/follow-button'
import { Link } from '@/i18n/navigation'

/**
 * Public creator page (FE-PAGE-01; presentation `CreatorProfileView` visitor
 * mode @ dc8467f). Not ported: goals and crypto wallets (FQ-2, FQ-3), tips,
 * single-post purchase (deferred), member counts, the sticky scroll header.
 */
export function CreatorPageView({
  profile,
  tiers,
  posts,
  categoryTitle,
  viewer,
}: CreatorPageData) {
  const t = useTranslations('creatorPage')
  const format = useFormatter()
  const name = profile.alias ?? t('unnamed')

  return (
    <article>
      <div
        aria-hidden
        className="h-40 w-full rounded-card bg-cover-mix bg-cover bg-center sm:h-56"
        style={
          profile.coverUrl
            ? { backgroundImage: `url(${JSON.stringify(profile.coverUrl)})` }
            : undefined
        }
      />

      <header className="-mt-10 flex flex-col gap-4 px-2 sm:-mt-12 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Avatar className="size-20 bg-card ring-4 ring-background sm:size-24">
            {profile.avatarUrl ? (
              <AvatarImage src={profile.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback className="text-title font-bold">
              {name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-title font-bold text-foreground">
            <bdi>{name}</bdi>
          </h1>
          <p className="flex flex-wrap gap-x-1.5 text-body-sm text-muted-foreground">
            {categoryTitle ? (
              <>
                <span>{categoryTitle}</span>
                <span aria-hidden>·</span>
              </>
            ) : null}
            {t.rich('followers', {
              count: profile.followerCount,
              formatted: format.number(profile.followerCount),
              b: (chunks) => (
                <b className="font-bold text-foreground">{chunks}</b>
              ),
            })}
          </p>
        </div>
        <CreatorActions
          creatorId={profile.id}
          viewer={viewer}
          following={profile.viewerFollows ?? false}
        />
      </header>

      {profile.bio ? (
        <p
          dir="auto"
          className="mt-4 max-w-2xl px-2 text-body leading-7 text-foreground sm:px-6"
        >
          {profile.bio}
        </p>
      ) : null}

      <Tabs defaultValue="posts" className="mt-8">
        <TabsList>
          <TabsTrigger value="posts">
            {t('tabs.posts', { count: format.number(posts.length) })}
          </TabsTrigger>
          <TabsTrigger value="tiers">
            {tiers === null
              ? t('tabs.tiersUnknown')
              : t('tabs.tiers', { count: format.number(tiers.length) })}
          </TabsTrigger>
          <TabsTrigger value="about">{t('tabs.about')}</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4">
          {posts.length === 0 ? (
            <EmptyState icon={<FileTextIcon />} title={t('emptyPosts')} />
          ) : (
            <ul className="grid gap-3">
              {posts.map((post) => (
                <li key={post.id}>
                  <Card className="gap-2 px-5 py-4">
                    <h2 dir="auto" className="text-subtitle font-bold">
                      {post.title}
                    </h2>
                    <p className="text-label text-muted-foreground">
                      <time dateTime={post.createdAt}>
                        {format.dateTime(new Date(post.createdAt), {
                          dateStyle: 'medium',
                        })}
                      </time>
                    </p>
                    {post.text ? (
                      <p
                        dir="auto"
                        className="line-clamp-3 text-body leading-7 text-muted-foreground"
                      >
                        {post.text}
                      </p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="tiers" className="mt-4">
          {tiers === null ? (
            <ErrorState title={t('tiersUnavailable')} />
          ) : tiers.length === 0 ? (
            <EmptyState icon={<GemIcon />} title={t('emptyTiers')} />
          ) : (
            <>
              {viewer === 'signedIn' ? (
                <p className="mb-3 text-label text-muted-foreground">
                  {t('comingSoon')}
                </p>
              ) : null}
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tiers.map((tier) => (
                  <li key={tier.id} className="flex">
                    <Card className="flex-1 gap-3 px-5 py-5">
                      <h2 dir="auto" className="text-subtitle font-bold">
                        {tier.title}
                      </h2>
                      <p className="numeric text-title-sm font-bold">
                        <Money
                          amountToman={tier.priceToman}
                          unitClassName="text-body font-medium text-muted-foreground"
                        />
                      </p>
                      {tier.description ? (
                        <p
                          dir="auto"
                          className="text-body-sm leading-6 text-muted-foreground"
                        >
                          {tier.description}
                        </p>
                      ) : null}
                      {tier.benefits.length > 0 ? (
                        <ul className="grid gap-1 text-body-sm">
                          {tier.benefits.map((benefit) => (
                            <li key={benefit.id} dir="auto">
                              {benefit.title}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-auto pt-2">
                        <TierAction creatorId={profile.id} viewer={viewer} />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </TabsContent>

        <TabsContent value="about" className="mt-4">
          {profile.bio || profile.links.length > 0 ? (
            <Card className="gap-4 px-5 py-5">
              {profile.bio ? (
                <p dir="auto" className="text-body leading-7">
                  {profile.bio}
                </p>
              ) : null}
              {profile.links.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {profile.links.map((link) => (
                    <li key={link.kind}>
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer nofollow ugc"
                        >
                          {t(`links.${link.kind}`)}
                          <ExternalLinkIcon aria-hidden className="size-3.5" />
                        </a>
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ) : (
            <EmptyState icon={<InfoIcon />} title={t('emptyAbout')} />
          )}
        </TabsContent>
      </Tabs>
    </article>
  )
}

function signInHref(creatorId: number) {
  return {
    pathname: '/auth/login',
    query: { returnTo: `/creators/${creatorId}` },
  } as const
}

/**
 * Follow / support. Anonymous → sign in and come back; signed in → a working
 * Follow (FE-PAGE-02) and a not-yet-available Support; owner → edit page.
 */
function CreatorActions({
  creatorId,
  viewer,
  following,
}: {
  creatorId: number
  viewer: CreatorPageViewer
  following: boolean
}) {
  const t = useTranslations('creatorPage')

  if (viewer === 'owner') {
    return (
      <Button asChild variant="outline">
        <Link href="/studio/page">{t('editPage')}</Link>
      </Button>
    )
  }
  if (viewer === 'anonymous') {
    return (
      <div className="flex flex-col gap-1.5 sm:items-end">
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={signInHref(creatorId)}>{t('follow')}</Link>
          </Button>
          <Button asChild variant="inverse">
            <Link href={signInHref(creatorId)}>{t('support')}</Link>
          </Button>
        </div>
        <p className="text-label text-muted-foreground">{t('signInHint')}</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5 sm:items-end">
      <div className="flex gap-2">
        <FollowButton creatorId={creatorId} following={following} />
        <Button variant="inverse" disabled aria-describedby="creator-soon">
          {t('support')}
        </Button>
      </div>
      <p id="creator-soon" className="text-label text-muted-foreground">
        {t('comingSoon')}
      </p>
    </div>
  )
}

function TierAction({
  creatorId,
  viewer,
}: {
  creatorId: number
  viewer: CreatorPageViewer
}) {
  const t = useTranslations('creatorPage')

  if (viewer === 'owner') return null
  if (viewer === 'anonymous') {
    return (
      <Button asChild className="w-full">
        <Link href={signInHref(creatorId)}>{t('joinTier')}</Link>
      </Button>
    )
  }
  return (
    <Button className="w-full" disabled>
      {t('joinTier')}
    </Button>
  )
}
