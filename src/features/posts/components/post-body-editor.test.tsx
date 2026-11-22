import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Editor } from '@tiptap/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithIntl } from '../../../../test/render'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import type { RichParts } from '../lib/rich-editor'
import { PostBodyEditor } from './post-body-editor'

// jsdom has no layout: ProseMirror measures a Range to scroll the caret into
// view after a focused command. Nothing here depends on the numbers.
const emptyRect = () => new DOMRect(0, 0, 0, 0)
if (!('getClientRects' in Range.prototype)) {
  Object.assign(Range.prototype, {
    getClientRects: () => [],
    getBoundingClientRect: emptyRect,
  })
}

const messages = { fa, en } as const
const c = en.posts.composer

function renderEditor({
  initial = { before: '', after: null } as RichParts,
  editable = true,
  locale = 'en' as keyof typeof messages,
} = {}) {
  const onChange = vi.fn<(parts: RichParts) => void>()
  const view = renderWithIntl(
    <PostBodyEditor
      initial={initial}
      isPublic
      editable={editable}
      onChange={onChange}
    />,
    { locale, strict: true }
  )
  return { ...view, onChange }
}

/** The editor is created after mount (`immediatelyRender: false`). */
async function textbox(name: string = c.bodyLabel) {
  return screen.findByRole('textbox', { name })
}

/**
 * Tiptap puts its editor on the ProseMirror element. Tests reach it to type:
 * jsdom has no real `beforeinput`/IME, so text goes in as a transaction.
 */
function editorOf(element: HTMLElement): Editor {
  return (element as HTMLElement & { editor: Editor }).editor
}

const lastParts = (onChange: ReturnType<typeof vi.fn>) =>
  onChange.mock.calls.at(-1)?.[0] as RichParts

describe('PostBodyEditor (FE-POST-03)', () => {
  it.each(['fa', 'en'] as const)(
    'shows every formatting control with its label in %s, and no media buttons',
    async (locale) => {
      const tb = messages[locale].posts.composer.toolbar
      renderEditor({ locale })
      await textbox(messages[locale].posts.composer.bodyLabel)
      const toolbar = screen.getByRole('toolbar', { name: tb.label })
      for (const name of [
        tb.bold,
        tb.italic,
        tb.link,
        tb.h2,
        tb.h3,
        tb.bulletList,
        tb.orderedList,
        tb.blockquote,
        tb.undo,
        tb.redo,
        messages[locale].posts.composer.insertDivider,
      ]) {
        expect(
          within(toolbar).getByRole('button', { name })
        ).toBeInTheDocument()
      }
      expect(toolbar).not.toHaveTextContent(/image|video|audio|poll/i)
      expect(
        screen.getByText(messages[locale].posts.composer.bodyPlaceholder)
      ).toBeInTheDocument()
    }
  )

  it('formats the selection and reports html on the allow-list', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor()
    const editor = editorOf(await textbox())
    act(() => {
      editor.chain().insertContent('سلام world').selectAll().run()
    })
    await user.click(screen.getByRole('button', { name: c.toolbar.bold }))
    expect(lastParts(onChange)).toEqual({
      before: '<p><strong>سلام world</strong></p>',
      after: null,
    })
    expect(
      screen.getByRole('button', { name: c.toolbar.bold })
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: c.toolbar.h2 }))
    expect(lastParts(onChange).before).toBe(
      '<h2><strong>سلام world</strong></h2>'
    )
    await user.click(screen.getByRole('button', { name: c.toolbar.undo }))
    expect(lastParts(onChange).before).toBe(
      '<p><strong>سلام world</strong></p>'
    )
  })

  it('inserts one divider, leaves it out of the html, and removes it', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor({
      initial: { before: '<p>a</p><p>b</p>', after: null },
    })
    const editor = editorOf(await textbox())
    act(() => {
      // The caret in "a": the divider goes after that paragraph.
      editor.commands.setTextSelection(2)
    })
    const insert = screen.getByRole('button', { name: c.insertDivider })
    await user.click(insert)
    expect(lastParts(onChange)).toEqual({
      before: '<p>a</p>',
      after: '<p>b</p>',
    })
    expect(insert).toBeDisabled()
    expect(screen.getByText(c.dividerFreePublic)).toBeInTheDocument()
    const separator = screen.getByRole('separator', { name: c.dividerLabel })
    await user.click(
      within(separator).getByRole('button', { name: c.removeDivider })
    )
    expect(lastParts(onChange)).toEqual({
      before: '<p>a</p><p>b</p>',
      after: null,
    })
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(insert).toBeEnabled()
  })

  it('starts with the divider at the stored block', async () => {
    renderEditor({ initial: { before: '<p>open</p>', after: '<p>gated</p>' } })
    await textbox()
    expect(
      screen.getByRole('separator', { name: c.dividerLabel })
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: c.insertDivider })).toBeDisabled()
  })

  it('sets a link only on http, https or mailto', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor({
      initial: { before: '<p>site</p>', after: null },
    })
    const editor = editorOf(await textbox())
    act(() => {
      editor.commands.selectAll()
    })
    await user.click(screen.getByRole('button', { name: c.toolbar.link }))
    const address = screen.getByRole('textbox', { name: c.toolbar.linkAddress })
    await user.type(address, 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: c.toolbar.linkApply }))
    expect(screen.getByRole('alert')).toHaveTextContent(c.toolbar.linkInvalid)
    expect(editor.getHTML()).not.toContain('<a')
    await user.clear(address)
    await user.type(address, 'https://a.test/x{Enter}')
    await waitFor(() =>
      expect(lastParts(onChange).before).toBe(
        '<p><a rel="noopener noreferrer nofollow ugc" href="https://a.test/x">site</a></p>'
      )
    )
    expect(
      screen.queryByRole('textbox', { name: c.toolbar.linkAddress })
    ).not.toBeInTheDocument()
  })

  it('with nothing selected, inserts the address as the linked text', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor({
      initial: { before: '<p>see it</p>', after: null },
    })
    const editor = editorOf(await textbox())
    act(() => {
      editor.commands.setTextSelection(5)
    })
    await user.click(screen.getByRole('button', { name: c.toolbar.link }))
    await user.type(
      screen.getByRole('textbox', { name: c.toolbar.linkAddress }),
      'mailto:a@b.test{Enter}'
    )
    await waitFor(() =>
      expect(lastParts(onChange).before).toBe(
        '<p>see <a rel="noopener noreferrer nofollow ugc" href="mailto:a@b.test">mailto:a@b.test</a>it</p>'
      )
    )
  })

  it('reports nothing on mount or when toggled read-only', async () => {
    const { onChange, rerender } = renderEditor({
      initial: { before: '<p>a</p>', after: null },
    })
    await textbox()
    rerender(
      <PostBodyEditor
        initial={{ before: '<p>a</p>', after: null }}
        isPublic
        editable={false}
        onChange={onChange}
      />
    )
    expect(await textbox()).toHaveAttribute('contenteditable', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('is read-only while the composer is frozen', async () => {
    renderEditor({
      editable: false,
      initial: { before: '<p>a</p>', after: null },
    })
    const box = await textbox()
    expect(box).toHaveAttribute('contenteditable', 'false')
    expect(screen.getByRole('button', { name: c.toolbar.bold })).toBeDisabled()
    expect(screen.getByRole('button', { name: c.insertDivider })).toBeDisabled()
  })

  it('keeps Persian and English lines apart, with no dir: both follow the page', async () => {
    const { onChange } = renderEditor()
    const box = await textbox()
    const editor = editorOf(box)
    act(() => {
      editor.chain().focus().insertContent('سلام').splitBlock().run()
      editor.chain().insertContent('Hello ۱۲۳').run()
    })
    expect(lastParts(onChange).before).toBe('<p>سلام</p><p>Hello ۱۲۳</p>')
    // A composition (IME) session in jsdom: start/end events do not break
    // the document or the reported body.
    fireEvent.compositionStart(box)
    act(() => {
      editor.commands.insertContent('ی')
    })
    fireEvent.compositionEnd(box, { data: 'ی' })
    expect(lastParts(onChange).before).toBe('<p>سلام</p><p>Hello ۱۲۳ی</p>')
  })
})
