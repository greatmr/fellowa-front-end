import { delay, HttpResponse, http } from 'msw'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const origin = 'https://api.fellowa.test'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', `${origin}/api`)
const { fetchOwnProfile, resendEmailCode, submitCredentials, verifyEmailCode } =
  await import('./auth-api')
afterAll(() => vi.unstubAllEnvs())

describe('server authentication API', () => {
  it.each(['login', 'register'] as const)(
    'reads the %s envelope without leaking other fields',
    async (mode) => {
      server.use(
        http.post(`${origin}/api/auth/${mode}`, async ({ request }) => {
          expect(await request.json()).toEqual({
            email: 'Creator@example.com',
            password: ' password ',
          })
          return HttpResponse.json(
            {
              data: {
                token: 'backend-token',
                isVerified: false,
                user: { id: 4 },
              },
              errors: null,
            },
            { status: 201 }
          )
        })
      )
      expect(
        await submitCredentials(mode, {
          email: 'Creator@example.com',
          password: ' password ',
        })
      ).toBe('backend-token')
    }
  )

  it('keeps explicit authorization isolated across concurrent identities and strips private fields', async () => {
    server.use(
      http.get(
        `${origin}/api/user/:id/profile`,
        async ({ request, params }) => {
          const id = Number(params.id)
          expect(request.headers.get('authorization')).toBe(
            `Bearer token-${id}`
          )
          await delay(id === 4 ? 10 : 0)
          return HttpResponse.json({
            data: {
              id,
              email: `user${id}@example.com`,
              alias: null,
              isVerified: id === 4,
              personal: { phoneNumber: 'private' },
              password: 'must-not-escape',
            },
            errors: null,
          })
        }
      )
    )
    const users = await Promise.all([
      fetchOwnProfile('token-4', 4),
      fetchOwnProfile('token-9', 9),
    ])
    expect(users).toEqual([
      { id: 4, email: 'user4@example.com', alias: null, isVerified: true },
      { id: 9, email: 'user9@example.com', alias: null, isVerified: false },
    ])
  })

  it.each([
    {
      data: {
        id: 9,
        email: 'creator@example.com',
        alias: null,
        isVerified: true,
      },
      errors: null,
    },
    {
      data: {
        id: 4,
        email: 'creator@example.com',
        alias: null,
        isVerified: 'true',
      },
      errors: null,
    },
    { data: null, errors: null },
    { id: 4, email: 'creator@example.com', alias: null, isVerified: true },
  ])('rejects a malformed or mismatched self profile', async (body) => {
    server.use(
      http.get(`${origin}/api/user/4/profile`, () => HttpResponse.json(body))
    )
    await expect(fetchOwnProfile('token', 4)).rejects.toMatchObject({
      name: 'InvalidAuthResponseError',
    })
  })

  it('sends verification and resend through the actual guarded PUT endpoints', async () => {
    server.use(
      http.put(`${origin}/api/auth/verify-code`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token')
        expect(await request.json()).toEqual({ code: '123456' })
        return HttpResponse.json({
          data: { message: 'Account verified successfully' },
          errors: null,
        })
      }),
      http.put(`${origin}/api/auth/resend-code`, ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token')
        return HttpResponse.json({
          data: { message: 'Verification code sent' },
          errors: null,
        })
      })
    )
    await expect(verifyEmailCode('token', '123456')).resolves.toBeUndefined()
    await expect(resendEmailCode('token')).resolves.toBeUndefined()
  })
})
