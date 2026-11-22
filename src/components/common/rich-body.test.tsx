import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { postBodyFromApi, type PostBody } from '@/lib/post-body'

import { RichBody } from './rich-body'

describe('RichBody (FE-POST-03)', () => {
  it('renders a plain body as text: markup stays visible text', () => {
    const body = postBodyFromApi('<em>hi</em>\nnext line', 'plain')
    const { container } = render(<RichBody body={body as PostBody} />)
    expect(container.querySelector('em')).toBeNull()
    expect(container.firstElementChild).toHaveAttribute('dir', 'auto')
    expect(container).toHaveTextContent('<em>hi</em> next line')
  })

  it('renders an html body the API sent, as elements', () => {
    const body = postBodyFromApi(
      '<h2 dir="auto">عنوان</h2><ul><li>یک</li></ul><blockquote><p>q</p></blockquote>',
      'html'
    )
    render(<RichBody body={body as PostBody} />)
    expect(
      screen.getByRole('heading', { level: 2, name: 'عنوان' })
    ).toBeVisible()
    expect(screen.getByRole('listitem')).toHaveTextContent('یک')
  })

  it('has no body for an empty string', () => {
    expect(postBodyFromApi('', 'html')).toBeNull()
    expect(postBodyFromApi(null, 'plain')).toBeNull()
  })

  it('cannot be handed html built on the client', () => {
    const local = '<img src=x onerror="alert(1)">'
    // @ts-expect-error a plain string is not ServerHtml: only an API parse makes one.
    const forged: PostBody = { format: 'html', html: local }
    expect(forged.format).toBe('html')
  })
})
