import type { PostBody } from '@/lib/post-body'
import { cn } from '@/lib/utils'

/**
 * How the Q-83 allow-list looks (p, br, strong, em, a, h2, h3, ul, ol, li,
 * blockquote), on the typography tokens. Shared with the editor, so what the
 * owner writes looks like what readers get.
 */
export const richBodyClass = cn(
  'break-words',
  '[&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0',
  '[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:text-title-sm [&_h2]:font-bold [&_h2]:text-foreground',
  '[&_h3]:mt-4 [&_h3]:mb-2 [&_h3]:text-subtitle [&_h3]:font-bold [&_h3]:text-foreground',
  '[&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0',
  '[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6',
  '[&_li]:my-1 [&_li>p]:my-0',
  '[&_blockquote]:my-3 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-4 [&_blockquote]:text-muted-foreground',
  '[&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4',
  '[&_strong]:font-bold'
)

type Props = {
  body: PostBody
  className?: string
}

/**
 * A post body (FE-POST-03). `plain` renders as text, line breaks kept, as it
 * always has. `html` renders the string the API sent, which the server
 * sanitised against the Q-83 allow-list before storing it (`rel` forced on
 * links, schemes limited to http, https and mailto). Nothing built on the
 * client can reach this: `PostBody`'s html variant is made only while parsing
 * a response (`postBodyFromApi`). A PARTIAL body arrives already cut at whole
 * blocks, so it is rendered as it is.
 */
export function RichBody({ body, className }: Props) {
  if (body.format === 'plain') {
    return (
      <p dir="auto" className={cn('whitespace-pre-line', className)}>
        {body.text}
      </p>
    )
  }
  return (
    <div
      className={cn(richBodyClass, className)}
      // Server-sanitised (Q-83); see the comment above and `postBodyFromApi`.
      dangerouslySetInnerHTML={{ __html: body.html }}
    />
  )
}
