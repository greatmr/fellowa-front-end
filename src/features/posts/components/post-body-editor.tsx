'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  Quote,
  Redo2,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { richBodyClass } from '@/components/common/rich-body'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { isAllowedHref } from '@/features/posts/lib/rich-body'
import {
  docToParts,
  partsToDoc,
  PAYWALL_NODE,
  richEditorExtensions,
  richEditorSchema,
  type RichParts,
} from '@/features/posts/lib/rich-editor'
import { cn } from '@/lib/utils'

type Props = {
  /** The body when the composer opened; the editor owns it from then on. */
  initial: RichParts
  isPublic: boolean
  /** Off while a saved post's attachments settle (the composer's fieldset). */
  editable: boolean
  onChange: (parts: RichParts) => void
}

/**
 * The rich-text body (FE-POST-03; presentation `ComposerView.tsx:287-398` @
 * d843c3b): Tiptap (FQ-34) limited to the Q-83 allow-list
 * (`lib/rich-editor.ts`), with a toolbar for bold, italic, link, H2/H3,
 * bulleted and numbered lists, blockquote, undo/redo and the paywall divider.
 * The media choices stay a post-level block below (FQ-30 (3)). Loaded only on
 * the composer, through `next/dynamic` (no SSR): the editor's code is not in
 * any public page's bundle.
 */
export function PostBodyEditor({
  initial,
  isPublic,
  editable,
  onChange,
}: Props) {
  const t = useTranslations('posts.composer')
  const ids = useId()
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  // The starting document is built once, from the body the composer opened.
  const [content] = useState(() =>
    partsToDoc(initial, richEditorSchema()).toJSON()
  )

  // Built once: new objects on every render would make Tiptap reset its
  // options (and the view's props) on each keystroke.
  const [options] = useState(() => ({
    extensions: richEditorExtensions({
      label: t('dividerLabel'),
      removeLabel: t('removeDivider'),
    }),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': t('bodyLabel'),
        'aria-describedby': `${ids}-hint`,
        class: cn(
          richBodyClass,
          'min-h-40 py-2 text-body leading-8 text-foreground outline-none'
        ),
      },
    },
  }))

  const editor = useEditor({
    immediatelyRender: false,
    ...options,
    content,
    editable,
    onUpdate: ({ editor: current }) =>
      onChangeRef.current(docToParts(current.state.doc)),
  })

  useEffect(() => {
    // No `update` event: toggling read-only must not report the body again.
    editor?.setEditable(editable, false)
  }, [editor, editable])

  const divided = useEditorState({
    editor,
    selector: ({ editor: current }) => (current ? hasDivider(current) : false),
  })

  return (
    <div className="grid gap-2">
      {editor ? (
        <Toolbar editor={editor} />
      ) : (
        <div className="h-11 border-y" aria-hidden />
      )}
      <div className="relative">
        <EditorContent editor={editor} />
        {editor ? <Placeholder editor={editor} /> : null}
      </div>
      <p id={`${ids}-hint`} className="text-caption text-muted-foreground">
        {divided
          ? isPublic
            ? t('dividerFreePublic')
            : t('dividerFree')
          : t('insertDividerHint')}
      </p>
    </div>
  )
}

function hasDivider(editor: Editor): boolean {
  let found = false
  editor.state.doc.forEach((node) => {
    if (node.type.name === PAYWALL_NODE) found = true
  })
  return found
}

function Placeholder({ editor }: { editor: Editor }) {
  const t = useTranslations('posts.composer')
  const empty = useEditorState({
    editor,
    selector: ({ editor: e }) => e.isEmpty,
  })
  if (!empty) return null
  return (
    <p
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-2 text-body leading-8 text-muted-foreground/70"
    >
      {t('bodyPlaceholder')}
    </p>
  )
}

type ToolKey =
  'bold' | 'italic' | 'h2' | 'h3' | 'bulletList' | 'orderedList' | 'blockquote'

const tools: { key: ToolKey; Icon: LucideIcon; run: (e: Editor) => void }[] = [
  { key: 'bold', Icon: Bold, run: (e) => e.chain().focus().toggleBold().run() },
  {
    key: 'italic',
    Icon: Italic,
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  {
    key: 'h2',
    Icon: Heading2,
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    key: 'h3',
    Icon: Heading3,
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    key: 'bulletList',
    Icon: List,
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    key: 'orderedList',
    Icon: ListOrdered,
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    key: 'blockquote',
    Icon: Quote,
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
]

function activeTools(editor: Editor): Record<ToolKey | 'link', boolean> {
  return {
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    h2: editor.isActive('heading', { level: 2 }),
    h3: editor.isActive('heading', { level: 3 }),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    blockquote: editor.isActive('blockquote'),
    link: editor.isActive('link'),
  }
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useTranslations('posts.composer.toolbar')
  const tComposer = useTranslations('posts.composer')
  const ids = useId()
  const [linkOpen, setLinkOpen] = useState(false)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      active: activeTools(e),
      editable: e.isEditable,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
      hasDivider: hasDivider(e),
    }),
  })
  const off = !state.editable

  return (
    <div className="grid gap-2 border-y py-2">
      <div
        role="toolbar"
        aria-label={t('label')}
        className="flex flex-wrap items-center gap-1"
      >
        {tools.slice(0, 2).map((tool) => (
          <ToolButton
            key={tool.key}
            label={t(tool.key)}
            Icon={tool.Icon}
            pressed={state.active[tool.key]}
            disabled={off}
            onClick={() => tool.run(editor)}
          />
        ))}
        <ToolButton
          label={t('link')}
          Icon={Link2}
          pressed={state.active.link || linkOpen}
          disabled={off}
          onClick={() => setLinkOpen((open) => !open)}
          controls={linkOpen ? `${ids}-link` : undefined}
        />
        <Divider />
        {tools.slice(2).map((tool) => (
          <ToolButton
            key={tool.key}
            label={t(tool.key)}
            Icon={tool.Icon}
            pressed={state.active[tool.key]}
            disabled={off}
            onClick={() => tool.run(editor)}
          />
        ))}
        <Divider />
        <ToolButton
          label={t('undo')}
          Icon={Undo2}
          disabled={off || !state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolButton
          label={t('redo')}
          Icon={Redo2}
          disabled={off || !state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        />
        <Divider />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-500/15 dark:text-violet-200"
          disabled={off || state.hasDivider}
          onClick={() => editor.chain().focus().insertPaywallDivider().run()}
        >
          <Lock aria-hidden strokeWidth={2} />
          {tComposer('insertDivider')}
        </Button>
      </div>
      {linkOpen ? (
        <LinkForm
          id={`${ids}-link`}
          editor={editor}
          onClose={() => setLinkOpen(false)}
        />
      ) : null}
    </div>
  )
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />
}

function ToolButton({
  label,
  Icon,
  pressed,
  disabled,
  onClick,
  controls,
}: {
  label: string
  Icon: LucideIcon
  pressed?: boolean
  disabled: boolean
  onClick: () => void
  controls?: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-controls={controls}
      disabled={disabled}
      // Keep the editor's selection: the command runs on it.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(pressed && 'bg-accent text-accent-foreground')}
    >
      <Icon aria-hidden />
    </Button>
  )
}

/**
 * The link's address, checked against the server's schemes (http, https,
 * mailto) before it is set; the server checks again and drops a refused one.
 */
function LinkForm({
  id,
  editor,
  onClose,
}: {
  id: string
  editor: Editor
  onClose: () => void
}) {
  const t = useTranslations('posts.composer.toolbar')
  const [href, setHref] = useState(
    () => (editor.getAttributes('link').href as string | undefined) ?? ''
  )
  const [invalid, setInvalid] = useState(false)
  const isLink = editor.isActive('link')

  function apply() {
    const value = href.trim()
    if (!isAllowedHref(value)) {
      setInvalid(true)
      return
    }
    const { empty } = editor.state.selection
    if (empty && !isLink) {
      // Nothing selected: the address itself becomes the linked text.
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: value,
          marks: [{ type: 'link', attrs: { href: value } }],
        })
        .run()
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: value })
        .run()
    }
    onClose()
  }

  function cancel() {
    onClose()
    editor.commands.focus()
  }

  function remove() {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    onClose()
  }

  return (
    <div id={id} className="grid gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-href`} className="sr-only">
          {t('linkAddress')}
        </label>
        <Input
          id={`${id}-href`}
          dir="ltr"
          type="url"
          inputMode="url"
          autoFocus
          value={href}
          placeholder="https://"
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => {
            setHref(event.target.value)
            setInvalid(false)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              apply()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              cancel()
            }
          }}
          className="h-8 max-w-sm flex-1"
        />
        <Button type="button" size="sm" onClick={apply}>
          {t('linkApply')}
        </Button>
        {isLink ? (
          <Button type="button" size="sm" variant="ghost" onClick={remove}>
            {t('linkRemove')}
          </Button>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={cancel}>
          {t('linkCancel')}
        </Button>
      </div>
      {invalid ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-label text-destructive"
        >
          {t('linkInvalid')}
        </p>
      ) : null}
    </div>
  )
}
