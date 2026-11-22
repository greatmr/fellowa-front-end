import { PostReaderSkeleton } from '@/features/post-reader/components/post-reader-skeleton'

export default function Loading() {
  return (
    <div className="mx-auto max-w-public px-4 py-8 sm:px-6 sm:py-10">
      <PostReaderSkeleton />
    </div>
  )
}
