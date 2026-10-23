import { HttpResponse, http } from 'msw'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { server } from '../../../test/msw/server'
import { ApiError } from './errors'

const apiOrigin = 'https://api.fellowa.test'

// Configure the real environment module before importing the real API client.
// Other test files retain their environment; no developer .env is required.
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
const { apiGet, apiPost } = await import('./client')

afterAll(() => vi.unstubAllEnvs())

describe('API request error normalization', () => {
  it('returns all validation messages from a real failed POST', async () => {
    server.use(
      http.post(`${apiOrigin}/auth/register`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [
              { message: 'email must be an email', code: 'BAD_REQUEST' },
              { message: 'password too short', code: 'BAD_REQUEST' },
            ],
          },
          { status: 400 }
        )
      )
    )

    await expect(apiPost('/auth/register', {})).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'BAD_REQUEST',
      message: 'email must be an email',
      messages: ['email must be an email', 'password too short'],
      isNetworkError: false,
    })
  })

  it.each([
    {
      status: 401,
      message: 'Email or password are wrong',
      code: 'AUTH_INVALID_CREDENTIALS',
    },
    {
      status: 409,
      message: 'Email already registered',
      code: 'AUTH_EMAIL_TAKEN',
    },
    {
      status: 429,
      message: 'ThrottlerException: Too Many Requests',
      code: 'TOO_MANY_REQUESTS',
    },
  ])('preserves domain/status codes on a $status response', async (failure) => {
    server.use(
      http.post(`${apiOrigin}/auth/login`, () =>
        HttpResponse.json(
          {
            data: null,
            errors: [{ message: failure.message, code: failure.code }],
          },
          { status: failure.status }
        )
      )
    )

    const error = await apiPost('/auth/login', {}).catch(
      (cause: unknown) => cause
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      ...failure,
      messages: [failure.message],
      isUnauthorized: failure.status === 401,
      isNetworkError: false,
    })
  })

  it('keeps a legacy plain-text upstream failure readable through GET', async () => {
    server.use(
      http.get(`${apiOrigin}/legacy`, () =>
        HttpResponse.text('Service unavailable', { status: 503 })
      )
    )

    await expect(apiGet('/legacy')).rejects.toMatchObject({
      message: 'Service unavailable',
      messages: ['Service unavailable'],
      status: 503,
      isNetworkError: false,
    })
  })

  it('retains the HTTP status and Axios fallback for an empty envelope', async () => {
    server.use(
      http.get(`${apiOrigin}/empty-error`, () =>
        HttpResponse.json({ data: null, errors: [] }, { status: 500 })
      )
    )

    await expect(apiGet('/empty-error')).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Request failed with status code 500',
      messages: ['Request failed with status code 500'],
      isNetworkError: false,
    })
  })

  it('distinguishes a network failure from an HTTP response', async () => {
    server.use(http.get(`${apiOrigin}/offline`, () => HttpResponse.error()))

    const error = await apiGet('/offline').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      message: 'Network Error',
      messages: ['Network Error'],
      isNetworkError: true,
    })
    expect(error).toHaveProperty('status', undefined)
    expect(error).toHaveProperty('code', undefined)
  })
})
