import { splitAtCodePoint } from '@/features/posts/lib/paywall'

/**
 * Rich post bodies (FE-POST-03, Q-83). An `html` body is the server's
 * sanitised HTML; its paywall is the index of the first gated top-level block.
 *
 * The block counter below is a port of the back-end's
 * `src/modules/content/rich-body.ts` (`topLevelBlocks`, BE-CONT-14), so the
 * index the composer sends and the one the server checks and cuts at are
 * counted the same way. `rich-body.test.ts` mirrors the back-end spec. It reads
 * the server's stored form (or the editor's own output, which sanitises to the
 * same blocks): every `<` starts a tag and every element is closed.
 */

/** Allowed elements that make a top-level block on their own (Q-83). */
const BLOCK_TAGS = new Set(['p', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote'])

/** Tags with no closing tag; `br` is the only one the allow-list keeps. */
const VOID_TAGS = new Set(['br'])

type TopLevelNode = {
  start: number
  end: number
  /** `space`: whitespace or a `<br />` alone. */
  kind: 'block' | 'inline' | 'space'
}

export type BlockRange = { start: number; end: number }

function topLevelNodes(html: string): TopLevelNode[] {
  const nodes: TopLevelNode[] = []
  let depth = 0
  let nodeStart = 0
  let nodeName = ''
  let i = 0
  while (i < html.length) {
    if (html[i] !== '<') {
      const next = html.indexOf('<', i)
      const end = next === -1 ? html.length : next
      if (depth === 0) {
        nodes.push({
          start: i,
          end,
          kind: /\S/.test(html.slice(i, end)) ? 'inline' : 'space',
        })
      }
      i = end
      continue
    }
    const close = html.indexOf('>', i)
    const end = close === -1 ? html.length : close + 1
    const tag = html.slice(i + 1, close === -1 ? html.length : close)
    const closing = tag.startsWith('/')
    const name = (
      /^[a-z0-9]+/i.exec(closing ? tag.slice(1) : tag)?.[0] ?? ''
    ).toLowerCase()
    const selfClosing = VOID_TAGS.has(name) || tag.endsWith('/')
    if (depth === 0) {
      if (closing || selfClosing) {
        nodes.push({ start: i, end, kind: 'space' })
      } else {
        nodeStart = i
        nodeName = name
        depth = 1
      }
    } else if (closing) {
      depth -= 1
      if (depth === 0) {
        nodes.push({
          start: nodeStart,
          end,
          kind: BLOCK_TAGS.has(nodeName) ? 'block' : 'inline',
        })
      }
    } else if (!selfClosing) {
      depth += 1
    }
    i = end
  }
  if (depth > 0)
    nodes.push({ start: nodeStart, end: html.length, kind: 'block' })
  return nodes
}

/**
 * The top-level blocks, in order: each block element once, whatever it nests;
 * one run of top-level text and inline elements; never whitespace or a lone
 * `<br />` between blocks. Empty blocks count.
 */
export function topLevelBlocks(html: string | null | undefined): BlockRange[] {
  if (!html) return []
  const blocks: BlockRange[] = []
  let run: BlockRange | null = null
  for (const node of topLevelNodes(html)) {
    if (node.kind === 'block') {
      if (run) blocks.push(run)
      run = null
      blocks.push({ start: node.start, end: node.end })
    } else if (node.kind === 'inline') {
      if (run) run.end = node.end
      else run = { start: node.start, end: node.end }
    }
  }
  if (run) blocks.push(run)
  return blocks
}

export function blockCount(html: string | null | undefined): number {
  return topLevelBlocks(html).length
}

export type HtmlParts = { before: string; after: string }

/**
 * Splits a stored `html` body at a block index: `before` is what PARTIAL shows
 * (the server's `htmlBeforeBlock`), `after` the rest. Past the end keeps it all.
 */
export function splitAtBlock(html: string, index: number): HtmlParts {
  const blocks = topLevelBlocks(html)
  const kept = Math.min(Math.max(0, Math.floor(index)), blocks.length)
  const cut = kept === 0 ? 0 : blocks[kept - 1].end
  return { before: html.slice(0, cut), after: html.slice(cut) }
}

/** Q-83: links on `http`, `https` and `mailto` only, absolute. */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:'])

/**
 * Whether an `href` passes the server's scheme allow-list. A relative or
 * protocol-relative URL has no scheme of its own and is refused, as the
 * sanitiser refuses it.
 */
export function isAllowedHref(href: string | null | undefined): boolean {
  if (!href) return false
  // No white space or control characters anywhere: the URL parser would drop
  // some of them silently, and what is checked must be what is stored.
  if (/\s/.test(href) || Array.from(href).some((ch) => ch < ' ')) return false
  // No markup characters: the browser may write `>` unescaped in an attribute
  // where the server stores `&gt;`, and the two block counts would differ.
  if (/[<>"'`]/.test(href)) return false
  try {
    return ALLOWED_PROTOCOLS.has(new URL(href).protocol)
  } catch {
    return false
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * A plain body as paragraphs: a blank line separates paragraphs, a single
 * line break stays a `<br>` (the plain body rendered `whitespace-pre-line`).
 * Every character is escaped, so text that looks like a tag stays text.
 */
export function plainToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n+/)
    .map((paragraph) => paragraph.replace(/^\n+|\n+$/g, ''))
    .filter((paragraph) => paragraph.trim() !== '')
    .map(
      (paragraph) =>
        `<p dir="auto">${paragraph.split('\n').map(escapeHtml).join('<br>')}</p>`
    )
    .join('')
}

/**
 * Q-83 option (a), for an existing `plain` post opened in the rich editor:
 * split at its code-point offset (Q-19) and turn each side into paragraphs.
 * The divider then sits at the block index that matches. Nothing is written
 * until the owner saves; the save sends `bodyFormat: 'html'`.
 */
export function plainPostToHtmlParts(
  text: string,
  paywallPosition: number | null
): { before: string; after: string | null } {
  if (paywallPosition === null)
    return { before: plainToHtml(text), after: null }
  const parts = splitAtCodePoint(text, paywallPosition)
  return { before: plainToHtml(parts.before), after: plainToHtml(parts.after) }
}
