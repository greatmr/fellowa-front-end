import { Editor } from '@tiptap/react'
import { afterEach, describe, expect, it } from 'vitest'

import { blockCount, splitAtBlock } from './rich-body'
import {
  docToParts,
  LINK_REL,
  partsToDoc,
  richEditorExtensions,
  richEditorSchema,
  type RichParts,
} from './rich-editor'

// jsdom has no ClipboardEvent; ProseMirror's `pasteHTML` only needs one to
// exist, and reads the HTML it is given, not the event.
if (typeof globalThis.ClipboardEvent === 'undefined') {
  class ClipboardEventStub extends Event {
    clipboardData = null
  }
  Object.assign(globalThis, { ClipboardEvent: ClipboardEventStub })
}

const editors: Editor[] = []

function makeEditor(parts: RichParts = { before: '', after: null }) {
  const doc = partsToDoc(parts, richEditorSchema())
  const editor = new Editor({
    extensions: richEditorExtensions({
      label: 'Paywall',
      removeLabel: 'Remove',
    }),
    content: doc.toJSON(),
  })
  editors.push(editor)
  return editor
}

afterEach(() => {
  while (editors.length) editors.pop()?.destroy()
})

const parts = (editor: Editor) => docToParts(editor.state.doc)

function textOf(html: string): string {
  const container = document.createElement('div')
  container.innerHTML = html
  return container.textContent ?? ''
}

/** Every tag and attribute in `html` is on the Q-83 allow-list. */
function expectAllowListOnly(html: string) {
  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'em',
    'a',
    'h2',
    'h3',
    'ul',
    'ol',
    'li',
    'blockquote',
  ])
  const container = document.createElement('div')
  container.innerHTML = html
  for (const element of container.querySelectorAll('*')) {
    const tag = element.tagName.toLowerCase()
    expect(allowedTags, `<${tag}>`).toContain(tag)
    for (const { name, value } of Array.from(element.attributes)) {
      if (name === 'dir') expect(['ltr', 'rtl', 'auto']).toContain(value)
      else if (tag === 'a' && name === 'rel') expect(value).toBe(LINK_REL)
      else if (tag === 'a' && name === 'href')
        expect(value).toMatch(/^(https?:|mailto:)/)
      else throw new Error(`attribute ${name} on <${tag}>`)
    }
  }
}

describe('the editor writes only the Q-83 allow-list', () => {
  it('writes every allowed element, with dir="auto" on text blocks', () => {
    const editor = makeEditor()
    editor
      .chain()
      .setContent(
        '<h2>T</h2><h3>S</h3><p>a<br>b <strong>c</strong> <em>d</em> <a href="https://a.test">l</a></p>' +
          '<ul><li><p>1</p></li></ul><ol><li><p>2</p></li></ol><blockquote><p>q</p></blockquote>'
      )
      .run()
    const { before } = parts(editor)
    expect(before).toBe(
      '<h2 dir="auto">T</h2><h3 dir="auto">S</h3>' +
        `<p dir="auto">a<br>b <strong>c</strong> <em>d</em> <a rel="${LINK_REL}" href="https://a.test">l</a></p>` +
        '<ul><li><p dir="auto">1</p></li></ul><ol><li><p dir="auto">2</p></li></ol>' +
        '<blockquote><p dir="auto">q</p></blockquote>'
    )
    expectAllowListOnly(before)
  })

  it.each([
    ['code and pre', '<p><code>x</code></p><pre><code>y</code></pre>'],
    ['strike and underline', '<p><s>x</s> <u>y</u> <del>z</del></p>'],
    ['h1, h4 and hr', '<h1>a</h1><h4>b</h4><hr><p>c</p>'],
    [
      'img, iframe and script',
      '<p>a<img src="x" onerror="alert(1)"></p><iframe src="https://e.test"></iframe><script>alert(1)</script>',
    ],
    [
      'style, class and handlers',
      '<p style="color:red" class="x" onclick="alert(1)">a</p>',
    ],
    [
      'a table and divs',
      '<table><tr><td>a</td></tr></table><div><span>b</span></div>',
    ],
    ['b and i', '<p><b>bold</b> <i>it</i></p>'],
    [
      'a link with target, title and its own rel',
      '<p><a href="https://a.test" target="_blank" title="t" rel="opener" class="c">l</a></p>',
    ],
  ])('normalises pasted %s to the allow-list', (_name, html) => {
    const editor = makeEditor()
    editor.view.pasteHTML(html)
    expectAllowListOnly(parts(editor).before)
  })

  it.each([
    'javascript:alert(1)',
    'data:text/html,x',
    '//evil.test',
    'ftp://a.test',
    'tel:1',
    'https://x.test/>',
  ])('drops a %s link and keeps its text', (href) => {
    const editor = makeEditor()
    editor.view.pasteHTML(`<p><a href="${href}">x</a></p>`)
    const { before } = parts(editor)
    expect(before).not.toContain('<a')
    expect(before).toContain('x')
    editor.chain().selectAll().setLink({ href }).run()
    expect(parts(editor).before).not.toContain('href')
  })

  it('maps b and i to strong and em', () => {
    const editor = makeEditor()
    editor.view.pasteHTML('<p><b>bold</b> <i>it</i></p>')
    expect(parts(editor).before).toContain('<strong>bold</strong> <em>it</em>')
  })

  it('does not autolink a typed URL', () => {
    const editor = makeEditor()
    editor.chain().focus().insertContent('see https://a.test ').run()
    expect(parts(editor).before).not.toContain('<a')
  })

  it('keeps Persian and mixed text, each paragraph with its own direction', () => {
    const editor = makeEditor()
    editor.chain().focus().insertContent('سلام دنیا').run()
    editor.chain().splitBlock().insertContent('Hello').run()
    expect(parts(editor).before).toBe(
      '<p dir="auto">سلام دنیا</p><p dir="auto">Hello</p>'
    )
  })

  it('keeps a stored dir on a container, and adds none', () => {
    const editor = makeEditor({
      before: '<ul dir="rtl"><li>یک</li></ul><ul><li>two</li></ul>',
      after: null,
    })
    expect(parts(editor).before).toBe(
      '<ul dir="rtl"><li><p dir="auto">یک</p></li></ul><ul><li><p dir="auto">two</p></li></ul>'
    )
  })

  it('writes nothing for an empty document', () => {
    expect(parts(makeEditor())).toEqual({ before: '', after: null })
  })
})

describe('the paywall divider', () => {
  const body = '<p dir="auto">یک</p><p dir="auto">دو</p><p dir="auto">سه</p>'

  it('is left out of the body; the blocks before it are the index', () => {
    const editor = makeEditor({ before: body, after: null })
    // Caret inside the second paragraph: the divider goes after it.
    editor.commands.setTextSelection(6)
    expect(editor.commands.insertPaywallDivider()).toBe(true)
    const result = parts(editor)
    expect(result).toEqual({
      before: '<p dir="auto">یک</p><p dir="auto">دو</p>',
      after: '<p dir="auto">سه</p>',
    })
    expect(result.before + result.after).not.toContain('paywall')
    expect(blockCount(result.before)).toBe(2)
  })

  it('goes before a block when the caret is at its start', () => {
    const editor = makeEditor({ before: body, after: null })
    editor.commands.setTextSelection(1)
    editor.commands.insertPaywallDivider()
    expect(parts(editor)).toEqual({ before: '', after: body })
  })

  it('allows only one', () => {
    const editor = makeEditor({ before: body, after: null })
    expect(editor.commands.insertPaywallDivider()).toBe(true)
    expect(editor.commands.insertPaywallDivider()).toBe(false)
    let count = 0
    editor.state.doc.forEach((node) => {
      if (node.type.name === 'paywallDivider') count += 1
    })
    expect(count).toBe(1)
  })

  it('cannot be created by pasting or by stored markup', () => {
    const editor = makeEditor({
      before: '<p>a</p><div data-paywall-divider=""></div><p>b</p>',
      after: null,
    })
    expect(parts(editor).after).toBeNull()
    editor.view.pasteHTML('<div data-paywall-divider=""></div>')
    expect(parts(editor).after).toBeNull()
  })

  it('removing it clears the paywall and joins the body', () => {
    const editor = makeEditor({
      before: '<p dir="auto">a</p>',
      after: '<p dir="auto">b</p>',
    })
    expect(parts(editor).after).toBe('<p dir="auto">b</p>')
    editor.commands.removePaywallDivider()
    expect(parts(editor)).toEqual({
      before: '<p dir="auto">a</p><p dir="auto">b</p>',
      after: null,
    })
  })

  it('renders as a separator with a remove button', () => {
    const editor = makeEditor({ before: '<p>a</p>', after: '<p>b</p>' })
    const separator = editor.view.dom.querySelector('[role="separator"]')
    expect(separator).toHaveAccessibleName('Paywall')
    const remove = separator?.querySelector('button')
    expect(remove).toHaveAccessibleName('Remove')
    remove?.click()
    expect(parts(editor).after).toBeNull()
  })
})

describe('loading at the stored index: parity with the server count', () => {
  it.each([
    ['simple paragraphs', '<p>a</p><p>b</p><p>c</p>', 2, 'ab'],
    [
      'a nested list counts once',
      '<p>a</p><ul><li>1<ul><li>1.1</li></ul></li></ul><p>c</p>',
      2,
      'a11.1',
    ],
    [
      'a top-level inline run',
      'x <strong>y</strong><p>b</p><p>c</p>',
      1,
      'x y',
    ],
    ['empty blocks', '<p></p><p>a</p><p></p><p>b</p>', 3, 'a'],
    ['index 0 gates everything', '<p>a</p><p>b</p>', 0, ''],
  ])('%s', (_name, stored, index, openText) => {
    const split = splitAtBlock(stored, index)
    const editor = makeEditor({ before: split.before, after: split.after })
    const saved = parts(editor)
    // The index the editor sends back is the one the server stored, and the
    // same text is in front of the divider.
    expect(blockCount(saved.before)).toBe(index)
    expect(textOf(saved.before)).toBe(openText)
    expect(saved.after).not.toBeNull()
  })

  it('a lone top-level <br /> becomes a block of its own; the index follows the body sent', () => {
    // Never the editor's own output. ProseMirror wraps the <br /> in a
    // paragraph, so the saved body has one more block before the divider,
    // and the index sent counts it: the divider stays between "b" and "c".
    const split = splitAtBlock('<p>a</p><br /><p>b</p><p>c</p>', 2)
    const saved = parts(
      makeEditor({ before: split.before, after: split.after })
    )
    expect(blockCount(saved.before)).toBe(3)
    expect(textOf(saved.before)).toBe('ab')
    expect(textOf(saved.after ?? '')).toBe('c')
  })

  it('round-trips its own output: same body, same index', () => {
    const first = {
      before: '<h2 dir="auto">عنوان</h2><p dir="auto">باز</p>',
      after: '<ul><li><p dir="auto">قفل</p></li></ul>',
    }
    const editor = makeEditor(first)
    expect(parts(editor)).toEqual(first)
  })
})
