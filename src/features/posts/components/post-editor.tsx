'use client'

import { useTranslations } from 'next-intl'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { usePostQuery } from '@/features/posts/api/post-hooks'
import { PostComposer } from '@/features/posts/components/post-composer'
import { isEditableType } from '@/features/posts/lib/post-draft'
import { postErrorKey } from '@/features/posts/lib/post-errors'
import { Link } from '@/i18n/navigation'

/**
 * The edit route's body: reads `GET /content/:id` (the owner's FULL view,
 * with `paywallPosition`) and opens the composer on it. A post that is not
 * the viewer's answers 404, like a missing one.
 */
export function PostEditor({
  viewerId,
  postId,
}: {
  viewerId: number
  postId: number
}) {
  const t = useTranslations('posts.composer')
  const tPosts = useTranslations('posts')
  const tCommon = useTranslations('common')
  const post = usePostQuery(viewerId, postId)

  const back = (
    <Button asChild variant="outline">
      <Link href="/studio/posts">{t('back')}</Link>
    </Button>
  )

  // Data first: a failed background refetch keeps the last data, and must
  // not replace a composer that holds unsaved edits.
  if (post.data) {
    if (!isEditableType(post.data.type)) {
      return (
        <EmptyState
          title={t('unsupportedTitle')}
          description={t('unsupportedBody')}
          action={back}
        />
      )
    }
    return (
      <PostComposer key={post.data.id} viewerId={viewerId} saved={post.data} />
    )
  }
  if (post.isError) {
    if (post.error.status === 404) {
      return (
        <EmptyState
          title={t('notFoundTitle')}
          description={t('notFoundBody')}
          action={back}
        />
      )
    }
    return (
      <ErrorState
        title={t('loadError')}
        description={tPosts(`errors.${postErrorKey(post.error)}`)}
        action={
          <Button type="button" onClick={() => void post.refetch()}>
            {tCommon('retry')}
          </Button>
        }
      />
    )
  }
  return (
    <p role="status" className="py-12 text-center text-muted-foreground">
      {tCommon('loading')}
    </p>
  )
}
