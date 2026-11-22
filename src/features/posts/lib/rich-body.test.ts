import { describe, expect, it } from 'vitest'

import {
  blockCount,
  isAllowedHref,
  plainPostToHtmlParts,
  plainToHtml,
  splitAtBlock,
  topLevelBlocks,
} from './rich-body'

const blocksOf = (html: string) =>
  topLevelBlocks(html).map((b) => html.slice(b.start, b.end))

/**
 * The same inputs and answers as the back-end's
 * `src/modules/content/rich-body.spec.ts` (BE-CONT-14), so the index the
 * composer sends is the one the server validates and cuts at.
 */
describe('block counting: parity with the back-end (Q-83)', () => {
  it.each<[string, string, number]>([
    [
      'each top-level block element once, whatever it nests',
      '<p>a</p><ul><li>1<ul><li>1.1</li></ul></li><li>2</li></ul><blockquote><p>q</p><p>r</p></blockquote><h2>h</h2>',
      4,
    ],
    [
      'a run of top-level text and inline elements is one block',
      'a <strong>b</strong><br />c<p>d</p>e',
      3,
    ],
    [
      'whitespace or a lone <br /> between blocks',
      '<p>a</p>\n  <br />\n<p>b</p>\n',
      2,
    ],
    ['an empty body', '', 0],
    ['white space only', '  \n', 0],
    ['escaped angle brackets are text', '<p>1 &lt; 2 &gt; 0</p><p>b</p>', 2],
    ['empty blocks are kept', '<p></p><p>a</p><p></p>', 3],
    ['the sanitiser’s output for <p><div>t</div></p>', '<p></p>t<p></p>', 3],
    ['a top-level li', '<li>x</li><p>y</p>', 2],
    ['h3 and dir attributes', '<h3 dir="rtl">ع</h3><p dir="auto">b</p>', 2],
    [
      'links with the forced rel',
      '<p><a href="https://a.test" rel="noopener noreferrer nofollow ugc">l</a></p>',
      1,
    ],
    ['the editor’s own <br> form', '<p dir="auto">a<br>b</p><p>c</p>', 2],
    ['an unclosed element counts as one block', '<p>a<strong>b', 1],
  ])('%s', (_name, html, count) => {
    expect(blockCount(html)).toBe(count)
  })

  it('returns the block ranges the server returns', () => {
    expect(
      blocksOf(
        '<p>a</p><ul><li>1<ul><li>1.1</li></ul></li><li>2</li></ul><blockquote><p>q</p><p>r</p></blockquote><h2>h</h2>'
      )
    ).toEqual([
      '<p>a</p>',
      '<ul><li>1<ul><li>1.1</li></ul></li><li>2</li></ul>',
      '<blockquote><p>q</p><p>r</p></blockquote>',
      '<h2>h</h2>',
    ])
    expect(blocksOf('a <strong>b</strong><br />c<p>d</p>e')).toEqual([
      'a <strong>b</strong><br />c',
      '<p>d</p>',
      'e',
    ])
    expect(blockCount(null)).toBe(0)
  })

  describe('splitAtBlock: the server’s PARTIAL cut, and the rest', () => {
    const html =
      '<p dir="rtl">سلام دنیا</p><ul><li>یک<ol><li>دو</li></ol></li></ul><p>پنهان</p>'

    it.each([
      [0, ''],
      [1, '<p dir="rtl">سلام دنیا</p>'],
      [2, '<p dir="rtl">سلام دنیا</p><ul><li>یک<ol><li>دو</li></ol></li></ul>'],
      [3, html],
      [99, html],
      [-1, ''],
    ])('index %i', (index, before) => {
      const parts = splitAtBlock(html, index)
      expect(parts.before).toBe(before)
      expect(parts.before + parts.after).toBe(html)
    })

    it('round-trips: the blocks before the cut are the index', () => {
      for (let i = 0; i <= blockCount(html); i += 1) {
        expect(blockCount(splitAtBlock(html, i).before)).toBe(i)
      }
    })
  })
})

describe('isAllowedHref (the server’s scheme allow-list)', () => {
  it.each(['https://a.test/x?y=1', 'http://a.test', 'mailto:a@b.test'])(
    'keeps %s',
    (href) => expect(isAllowedHref(href)).toBe(true)
  )

  it.each([
    'javascript:alert(1)',
    ' JaVaScRiPt:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.test/x',
    '/relative',
    'a.test',
    'ftp://a.test',
    'tel:123',
    // Markup characters would serialise differently from the server's form.
    'https://x.test/>',
    'https://x.test/"onmouseover="x',
    "https://x.test/'",
    'https://x.test/<b>',
    'https://x.test/`',
    '',
    null,
  ])('refuses %s', (href) => expect(isAllowedHref(href)).toBe(false))
})

describe('plain → html conversion (Q-83 option a)', () => {
  it('makes paragraphs of blank-line separated text and keeps single breaks', () => {
    expect(plainToHtml('یک\nدو\n\nسه')).toBe(
      '<p dir="auto">یک<br>دو</p><p dir="auto">سه</p>'
    )
  })

  it('escapes what looks like markup, so it stays text', () => {
    const html = plainToHtml('<script>alert(1)</script> & "q"')
    expect(html).toBe(
      '<p dir="auto">&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;q&quot;</p>'
    )
    expect(blockCount(html)).toBe(1)
  })

  it('drops empty paragraphs and normalises CRLF', () => {
    expect(plainToHtml('\r\n\r\na\r\n\r\n\r\n\r\nb\n\n')).toBe(
      '<p dir="auto">a</p><p dir="auto">b</p>'
    )
    expect(plainToHtml('   ')).toBe('')
  })

  it('splits a paywalled post at its code-point offset and puts the divider at the matching block', () => {
    // "یک\n\nدو" is 6 code points; the emoji counts one (Q-19).
    const text = 'یک\n\nدو😀\n\nسه\n\nچهار'
    const parts = plainPostToHtmlParts(text, 7)
    expect(parts).toEqual({
      before: '<p dir="auto">یک</p><p dir="auto">دو😀</p>',
      after: '<p dir="auto">سه</p><p dir="auto">چهار</p>',
    })
    expect(blockCount(parts.before)).toBe(2)
  })

  it('splits mid-paragraph into two paragraphs', () => {
    expect(plainPostToHtmlParts('abcdef', 3)).toEqual({
      before: '<p dir="auto">abc</p>',
      after: '<p dir="auto">def</p>',
    })
  })

  it('has no divider without a paywall, and a position past the end gates nothing', () => {
    expect(plainPostToHtmlParts('a\n\nb', null)).toEqual({
      before: '<p dir="auto">a</p><p dir="auto">b</p>',
      after: null,
    })
    expect(plainPostToHtmlParts('ab', 10)).toEqual({
      before: '<p dir="auto">ab</p>',
      after: '',
    })
  })
})
