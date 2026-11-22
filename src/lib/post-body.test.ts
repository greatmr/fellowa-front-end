import { describe, expect, it } from 'vitest'

import { htmlToSearchText } from '@/lib/post-body'

describe('htmlToSearchText', () => {
  it('keeps the text and drops tags and attribute values', () => {
    expect(
      htmlToSearchText(
        '<p class="lead">one <strong>two</strong></p><p><a href="https://x.test/a>b" title=\'t>q\'>three</a></p>'
      )
    ).toBe('one two three')
  })

  it('drops comments', () => {
    expect(htmlToSearchText('<p>a<!-- <b>hidden</b> --> b</p>')).toBe('a b')
  })

  it('decodes entities after the tags are gone, so they stay text', () => {
    expect(
      htmlToSearchText(
        '<p>&lt;strong&gt; &amp; &quot;x&quot; &#1601; &#x6A9;</p>'
      )
    ).toBe('<strong> & "x" ف ک')
    expect(htmlToSearchText('<p>&unknown; &#0;</p>')).toBe('&unknown; &#0;')
  })

  it('collapses whitespace and keeps the zero-width non-joiner', () => {
    expect(htmlToSearchText('<p>\n  می&zwnj;خواهم&nbsp;&nbsp;ضبط\t</p>')).toBe(
      'می‌خواهم ضبط'
    )
  })
})
