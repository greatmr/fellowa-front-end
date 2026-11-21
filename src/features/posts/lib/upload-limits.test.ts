import { describe, expect, it } from 'vitest'

import { SERVER_ACTION_BODY_LIMIT_BYTES } from '@/features/tiers/lib/cover-limits'

import {
  MAX_POST_ATTACHMENT_BYTES,
  MAX_POST_IMAGE_BYTES,
  POST_IMAGE_TYPES,
  fileProblem,
} from './upload-limits'

describe('post upload limits', () => {
  it('fit inside the Server Action body limit, with room for the multipart framing', () => {
    expect(MAX_POST_IMAGE_BYTES).toBeLessThan(SERVER_ACTION_BODY_LIMIT_BYTES)
    expect(MAX_POST_ATTACHMENT_BYTES).toBeLessThan(
      SERVER_ACTION_BODY_LIMIT_BYTES
    )
  })

  it('refuses another type, an empty file and one over the limit', () => {
    const file = (type: string, size: number) =>
      new File([new Uint8Array(size)], 'f', { type })
    expect(fileProblem(file('image/png', 10), POST_IMAGE_TYPES, 100)).toBe(null)
    expect(fileProblem(file('image/svg+xml', 10), POST_IMAGE_TYPES, 100)).toBe(
      'type'
    )
    expect(fileProblem(file('image/png', 0), POST_IMAGE_TYPES, 100)).toBe(
      'size'
    )
    expect(fileProblem(file('image/png', 101), POST_IMAGE_TYPES, 100)).toBe(
      'size'
    )
    expect(fileProblem(file('image/png', 100), POST_IMAGE_TYPES, 100)).toBe(
      null
    )
  })
})
