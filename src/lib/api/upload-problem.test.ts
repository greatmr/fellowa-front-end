import { describe, expect, it } from 'vitest'

import { ApiError } from '@/lib/api/errors'
import { uploadProblem } from '@/lib/api/upload-problem'

const failure = (status: number | undefined, code?: string) =>
  new ApiError({ message: 'x', status, code })

describe('uploadProblem', () => {
  it.each([
    [400, 'USER_ALIAS_REQUIRED', 'noPage'],
    [401, undefined, 'sessionExpired'],
    [413, 'UPLOAD_TOO_LARGE', 'size'],
    [413, 'PAYLOAD_TOO_LARGE', 'size'],
    [415, 'UPLOAD_TYPE_NOT_ALLOWED', 'type'],
    [503, 'INTEGRATION_NOT_CONFIGURED', 'unavailable'],
    [500, undefined, 'storage'],
    [403, 'INVALID_REQUEST', 'requestRefused'],
    [403, undefined, 'accountRefused'],
    [404, 'CONTENT_NOT_FOUND', 'failed'],
    [400, 'INVALID_REQUEST', 'failed'],
  ] as const)('maps %s %s to %s', (status, code, problem) => {
    expect(uploadProblem(failure(status, code))).toBe(problem)
  })

  it('never calls another failure "not configured"', () => {
    expect(uploadProblem(failure(503))).toBe('failed')
    expect(uploadProblem(failure(500, 'INTEGRATION_NOT_CONFIGURED'))).toBe(
      'storage'
    )
    expect(
      uploadProblem(new ApiError({ message: 'x', isNetworkError: true }))
    ).toBe('failed')
  })
})
