import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'

import { ApiError, toApiError } from './errors'

function httpError(data: unknown, status = 400) {
  return new AxiosError('Request failed', undefined, undefined, undefined, {
    data,
    status,
    statusText: 'Bad Request',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })
}

describe('toApiError', () => {
  it('preserves ordered validation messages from the backend exception filter', () => {
    const cause = httpError({
      data: null,
      errors: [
        { message: 'email must be an email', code: 'BAD_REQUEST' },
        { message: 'password too short', code: 'BAD_REQUEST' },
      ],
    })

    const error = toApiError(cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      name: 'ApiError',
      status: 400,
      message: 'email must be an email',
      messages: ['email must be an email', 'password too short'],
      code: 'BAD_REQUEST',
      isNetworkError: false,
      cause,
    })
  })

  it('prefers envelope messages and their code over legacy fields', () => {
    const error = toApiError(
      httpError({
        data: null,
        errors: [{ message: 'Current failure', code: 'CURRENT_CODE' }],
        message: 'Old failure',
        error: 'Old error',
        code: 'OLD_CODE',
      })
    )

    expect(error.messages).toEqual(['Current failure'])
    expect(error.code).toBe('CURRENT_CODE')
  })

  it('ignores malformed entries without losing valid messages or borrowing a code', () => {
    const error = toApiError(
      httpError({
        data: null,
        errors: [
          null,
          'Not an envelope entry',
          { message: '  ', code: 'DO_NOT_USE' },
          { message: 7, code: 'ALSO_INVALID' },
          { message: '  Keep server text  ', code: 'FIRST_VALID' },
          { message: 'Another error', code: 'SECOND_VALID' },
        ],
      })
    )

    expect(error.messages).toEqual(['  Keep server text  ', 'Another error'])
    expect(error.message).toBe('  Keep server text  ')
    expect(error.code).toBe('FIRST_VALID')
  })

  it.each([undefined, null, 7, '', '  '])(
    'does not borrow another code when the first usable message has code %j',
    (code) => {
      const error = toApiError(
        httpError({
          errors: [
            { code: 'ORPHAN_CODE' },
            { message: 'First error', code },
            { message: 'Second error', code: 'SECOND_CODE' },
          ],
          code: 'LEGACY_CODE',
        })
      )

      expect(error.messages).toEqual(['First error', 'Second error'])
      expect(error.code).toBeUndefined()
    }
  )

  it.each([[], null, {}, [{ message: ' ' }], [false, 7]])(
    'reads legacy validation messages when the envelope errors are %j',
    (errors) => {
      const error = toApiError(
        httpError({
          errors,
          message: ['email must be an email', null, ' ', 'password too short'],
          code: 'VALIDATION_FAILED',
          error: 'Bad Request',
        })
      )

      expect(error.messages).toEqual([
        'email must be an email',
        'password too short',
      ])
      expect(error.code).toBe('VALIDATION_FAILED')
    }
  )

  it.each([
    {
      data: { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
      message: 'Unauthorized',
      code: 'Unauthorized',
    },
    {
      data: { message: [], error: 'Bad Request' },
      message: 'Bad Request',
      code: 'Bad Request',
    },
    {
      data: 'Upstream service unavailable',
      message: 'Upstream service unavailable',
    },
  ])('keeps legacy failures readable: $message', ({ data, message, code }) => {
    const error = toApiError(httpError(data))

    expect(error.message).toBe(message)
    expect(error.messages).toEqual([message])
    expect(error.code).toBe(code)
  })

  it.each([
    undefined,
    null,
    7,
    [],
    '',
    ' ',
    { errors: [] },
    { message: [null, ' '] },
  ])('uses the Axios message for an unusable body %j', (data) => {
    const error = toApiError(httpError(data, 502))

    expect(error.message).toBe('Request failed')
    expect(error.messages).toEqual(['Request failed'])
    expect(error.status).toBe(502)
    expect(error.isNetworkError).toBe(false)
  })

  it.each([
    { status: 401, unauthorized: true, forbidden: false, notFound: false },
    { status: 403, unauthorized: false, forbidden: true, notFound: false },
    { status: 404, unauthorized: false, forbidden: false, notFound: true },
    { status: 409, unauthorized: false, forbidden: false, notFound: false },
  ])('preserves status helpers for $status', (expected) => {
    const error = toApiError(
      httpError({ errors: [{ message: 'Denied' }] }, expected.status)
    )

    expect(error.isUnauthorized).toBe(expected.unauthorized)
    expect(error.isForbidden).toBe(expected.forbidden)
    expect(error.isNotFound).toBe(expected.notFound)
  })

  it('marks an Axios failure without a response as a network error', () => {
    const cause = new AxiosError('Network Error', 'ERR_NETWORK')
    const error = toApiError(cause)

    expect(error).toMatchObject({
      message: 'Network Error',
      messages: ['Network Error'],
      isNetworkError: true,
      cause,
    })
    expect(error.status).toBeUndefined()
    expect(error.code).toBeUndefined()
  })

  it('preserves an ApiError instance on repeated normalization', () => {
    const error = new ApiError({ message: 'Already normalized', status: 403 })

    expect(toApiError(error)).toBe(error)
  })

  it('preserves a non-Axios Error and its cause without marking it as network failure', () => {
    const cause = new Error('Unexpected exception')

    expect(toApiError(cause)).toMatchObject({
      message: 'Unexpected exception',
      messages: ['Unexpected exception'],
      cause,
      isNetworkError: false,
    })
  })

  it.each([undefined, null, 'Thrown text', 7, { message: 'Not an Error' }])(
    'handles an unknown thrown value %j without interpreting it as an API body',
    (cause) => {
      const error = toApiError(cause)

      expect(error).toMatchObject({
        message: 'Unexpected error',
        messages: ['Unexpected error'],
        isNetworkError: false,
      })
      expect(error.cause).toBe(cause)
    }
  )
})
