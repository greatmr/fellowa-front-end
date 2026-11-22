import { Link } from '@tiptap/extension-link'
import { Fragment, DOMParser as PMDOMParser } from '@tiptap/pm/model'
import type { Node as PMNode, Schema } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import {
  elementFromString,
  Extension,
  getHTMLFromFragment,
  getSchema,
  Node,
  type AnyExtension,
} from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'

import { isAllowedHref } from '@/features/posts/lib/rich-body'

/**
 * The rich editor's schema (FE-POST-03, FQ-34 Tiptap, Q-83 allow-list). The
 * schema IS the allow-list: Tiptap writes, and ProseMirror parses (on load
 * and on paste), only the nodes and marks registered here, so pasted markup
 * outside the list is reduced to its text. What it can produce:
 *
 * | HTML | from |
 * |---|---|
 * | `p`, `br` | Paragraph, HardBreak |
 * | `h2`, `h3` | Heading, levels 2 and 3 only |
 * | `ul`, `ol`, `li` | BulletList, OrderedList, ListItem (an `li` holds `p`s) |
 * | `blockquote` | Blockquote |
 * | `strong`, `em` | Bold, Italic |
 * | `a href rel` | Link: http, https and mailto only; no autolink, no open on click |
 *
 * Off: code, code block, strike, underline, horizontal rule, other heading
 * levels, images (not in StarterKit). The paywall divider is a top-level atom
 * that is never serialised: its position becomes `paywallPosition`.
 */

/** What the server forces on every link (`RICH_BODY_LINK_REL`); sent the same. */
export const LINK_REL = 'noopener noreferrer nofollow ugc'

export const PAYWALL_NODE = 'paywallDivider'

type DividerOptions = {
  /** The divider's visible and accessible name. */
  label: string
  /** The name of its remove button. */
  removeLabel: string
}

const DIR_VALUES = new Set(['ltr', 'rtl', 'auto'])

function dirOf(element: HTMLElement): string | null {
  const dir = element.getAttribute('dir')?.toLowerCase() ?? ''
  return DIR_VALUES.has(dir) ? dir : null
}

/**
 * `dir` as the server allows it (FE-I18N-02). A stored value is parsed and
 * kept on every block, but the editor never adds one: typing direction
 * follows the page (owner, 2026-11-22), so a new block inherits the editor's
 * direction, which inherits the page's `<html dir>`. No `dir="auto"`, which
 * would flip a Latin-first line, and an empty one, to LTR.
 */
const BlockDirection = Extension.create({
  name: 'blockDirection',
  addGlobalAttributes() {
    return [
      {
        types: [
          'paragraph',
          'heading',
          'bulletList',
          'orderedList',
          'listItem',
          'blockquote',
        ],
        attributes: {
          dir: {
            default: null,
            // A new block from Enter starts clean rather than copying it.
            keepOnSplit: false,
            parseHTML: (element) => dirOf(element),
            renderHTML: (attributes) =>
              attributes.dir ? { dir: attributes.dir } : {},
          },
        },
      },
    ]
  },
})

/** The divider may only sit between top-level blocks. */
const PostDocument = Node.create({
  name: 'doc',
  topNode: true,
  content: '(block | paywall)+',
})

/** Only `href` and `rel` (the forced value); no `target`, `class` or `title`. */
const SafeLink = Link.extend({
  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute('href'),
      },
      rel: { default: LINK_REL, parseHTML: () => LINK_REL },
    }
  },
}).configure({
  autolink: false,
  openOnClick: false,
  linkOnPaste: false,
  protocols: [],
  defaultProtocol: 'https',
  // `rel` is the attribute above; the server rewrites `a` in its own order.
  HTMLAttributes: { target: null, rel: LINK_REL, class: null },
  isAllowedUri: (url) => isAllowedHref(url),
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paywallDivider: {
      /** Puts the divider between top-level blocks at the selection. */
      insertPaywallDivider: () => ReturnType
      removePaywallDivider: () => ReturnType
    }
  }
}

function countDividers(doc: PMNode): number {
  let count = 0
  doc.forEach((node) => {
    if (node.type.name === PAYWALL_NODE) count += 1
  })
  return count
}

function dividerPos(doc: PMNode): number | null {
  let found: number | null = null
  doc.forEach((node, offset) => {
    if (node.type.name === PAYWALL_NODE) found = offset
  })
  return found
}

/**
 * The paywall divider (presentation `ComposerView.tsx:137-151,379-387`): one
 * per post, non-editable, top level only. It has no parse rule, so neither a
 * paste nor stored HTML can create one; only the command can.
 */
export const PaywallDivider = Node.create<DividerOptions>({
  name: PAYWALL_NODE,
  group: 'paywall',
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { label: '', removeLabel: '' }
  },

  parseHTML() {
    return []
  },

  renderHTML() {
    return ['div', { 'data-paywall-divider': '' }]
  },

  addNodeView() {
    const { label, removeLabel } = this.options
    return ({ editor, getPos }) => {
      const dom = document.createElement('div')
      dom.contentEditable = 'false'
      dom.setAttribute('role', 'separator')
      dom.setAttribute('aria-label', label)
      dom.setAttribute('data-paywall-divider', '')
      dom.className = 'my-3 flex items-center gap-3 py-1 select-none'
      const line = () => {
        const span = document.createElement('span')
        span.setAttribute('aria-hidden', 'true')
        span.className =
          'h-px flex-1 border-t border-dashed border-violet-300 dark:border-violet-500/40'
        return span
      }
      const badge = document.createElement('span')
      badge.className =
        'rounded-md bg-violet-50 px-2.5 py-1 text-label font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-200'
      badge.textContent = label
      const remove = document.createElement('button')
      remove.type = 'button'
      remove.textContent = '×'
      remove.setAttribute('aria-label', removeLabel)
      remove.title = removeLabel
      remove.className =
        // Hidden while the editor is read-only (the root's contenteditable).
        'inline-flex size-7 items-center justify-center rounded-md text-subtitle text-muted-foreground hover:bg-accent hover:text-foreground in-[.ProseMirror[contenteditable=false]]:hidden'
      remove.addEventListener('mousedown', (event) => event.preventDefault())
      remove.addEventListener('click', () => {
        if (!editor.isEditable) return
        const pos = getPos()
        if (typeof pos !== 'number') return
        editor
          .chain()
          .focus()
          .deleteRange({ from: pos, to: pos + 1 })
          .run()
      })
      dom.append(line(), badge, remove, line())
      return { dom, ignoreMutation: () => true, stopEvent: () => true }
    }
  },

  addCommands() {
    return {
      insertPaywallDivider:
        () =>
        ({ state, tr, dispatch }) => {
          if (countDividers(state.doc) > 0) return false
          const { $from } = state.selection
          // At the start of a top-level block: before it; else after it.
          const at =
            $from.depth === 0
              ? $from.pos
              : $from.depth === 1 && $from.parentOffset === 0
                ? $from.before(1)
                : $from.after(1)
          if (dispatch) {
            tr.insert(at, state.schema.nodes[PAYWALL_NODE].create())
            tr.scrollIntoView()
          }
          return true
        },
      removePaywallDivider:
        () =>
        ({ state, tr, dispatch }) => {
          const pos = dividerPos(state.doc)
          if (pos === null) return false
          if (dispatch) tr.delete(pos, pos + 1)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('paywallDividerOnlyOne'),
        filterTransaction: (tr) => !tr.docChanged || countDividers(tr.doc) <= 1,
      }),
    ]
  },
})

export function richEditorExtensions(divider: DividerOptions): AnyExtension[] {
  return [
    StarterKit.configure({
      document: false,
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
      horizontalRule: false,
      link: false,
      heading: { levels: [2, 3] },
    }),
    PostDocument,
    BlockDirection,
    SafeLink,
    PaywallDivider.configure(divider),
  ]
}

export type RichParts = {
  /** The body, or the part before the divider, as the editor writes it. */
  before: string
  /** The part after the divider; `null` when there is none. */
  after: string | null
}

function topLevel(doc: PMNode): PMNode[] {
  const nodes: PMNode[] = []
  doc.forEach((node) => nodes.push(node))
  return nodes
}

function isEmptyParagraph(node: PMNode): boolean {
  return node.type.name === 'paragraph' && node.content.size === 0
}

function serialize(nodes: PMNode[], schema: Schema): string {
  return nodes.length === 0
    ? ''
    : getHTMLFromFragment(Fragment.from(nodes), schema)
}

/**
 * The editor's document as the body a save sends: the blocks before the
 * divider and those after it, the divider itself left out (Q-83). Empty
 * paragraphs at the very end (the one the editor keeps for the caret) are
 * dropped; other empty blocks are kept, as the server keeps them.
 */
export function docToParts(doc: PMNode): RichParts {
  const nodes = topLevel(doc)
  let end = nodes.length
  while (end > 0 && isEmptyParagraph(nodes[end - 1])) end -= 1
  const at = nodes.findIndex((node) => node.type.name === PAYWALL_NODE)
  const schema = doc.type.schema
  if (at === -1)
    return { before: serialize(nodes.slice(0, end), schema), after: null }
  return {
    before: serialize(nodes.slice(0, at), schema),
    after: serialize(nodes.slice(at + 1, Math.max(end, at + 1)), schema),
  }
}

function parseBlocks(html: string, schema: Schema): PMNode[] {
  if (!html.trim()) return []
  return topLevel(PMDOMParser.fromSchema(schema).parse(elementFromString(html)))
}

/**
 * The editor's starting document: each side parsed on its own, so the divider
 * sits exactly at the block boundary the server counted, however ProseMirror
 * normalises what it parses (a lone top-level `<br>`, a stray `li`).
 */
export function partsToDoc(parts: RichParts, schema: Schema): PMNode {
  const before = parseBlocks(parts.before, schema)
  const nodes =
    parts.after === null
      ? before
      : [
          ...before,
          schema.nodes[PAYWALL_NODE].create(),
          ...parseBlocks(parts.after, schema),
        ]
  return schema.topNodeType.create(
    null,
    nodes.length > 0 ? nodes : [schema.nodes.paragraph.create()]
  )
}

/** The schema without an editor, to build the starting document up front. */
export function richEditorSchema(): Schema {
  return getSchema(richEditorExtensions({ label: '', removeLabel: '' }))
}
