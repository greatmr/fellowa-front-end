import { delay, HttpResponse, http } from 'msw'
import { afterAll, describe, expect, it, vi } from 'vitest'

import { server } from '../../../../test/msw/server'

const origin = 'https://api.fellowa.test'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', `${origin}/api`)
const {
  changePassword,
  confirmPasswordReset,
  exchangeGoogleCode,
  fetchOwnProfile,
  requestPasswordReset,
  resendEmailCode,
  setCreatorAlias,
  submitCredentials,
  verifyAuthToken,
  verifyEmailCode,
} = await import('./auth-api')
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

  it('sends the remaining protected mutations with the session bearer token', async () => {
    server.use(
      http.put(`${origin}/api/auth/alias`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token')
        expect(await request.json()).toEqual({ alias: 'creator-name' })
        return HttpResponse.json({
          data: { message: 'Alias set successfully' },
          errors: null,
        })
      }),
      http.put(`${origin}/api/auth/reset-password`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBe('Bearer token')
        expect(await request.json()).toEqual({
          currentPassword: 'old-password',
          newPassword: 'new-password',
        })
        return HttpResponse.json({
          data: { message: 'Password changed successfully' },
          errors: null,
        })
      })
    )

    await expect(
      setCreatorAlias('token', 'creator-name')
    ).resolves.toBeUndefined()
    await expect(
      changePassword('token', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      })
    ).resolves.toBeUndefined()
  })

  it('uses the public password recovery routes and DTO bodies', async () => {
    server.use(
      http.post(`${origin}/api/auth/forgot-password`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBeNull()
        expect(await request.json()).toEqual({ email: 'creator@example.com' })
        return HttpResponse.json(
          {
            data: {
              message:
                'If that email exists, a password reset token has been sent',
            },
            errors: null,
          },
          { status: 201 }
        )
      }),
      http.post(
        `${origin}/api/auth/reset-password/confirm`,
        async ({ request }) => {
          expect(request.headers.get('authorization')).toBeNull()
          expect(await request.json()).toEqual({
            token: 'reset-token-from-email',
            newPassword: 'new-password',
          })
          return HttpResponse.json(
            { data: { message: 'Password has been reset' }, errors: null },
            { status: 201 }
          )
        }
      )
    )

    await expect(
      requestPasswordReset('creator@example.com')
    ).resolves.toBeUndefined()
    await expect(
      confirmPasswordReset({
        token: 'reset-token-from-email',
        newPassword: 'new-password',
      })
    ).resolves.toBeUndefined()
  })

  it('exchanges a Google authorization code and returns only the access token', async () => {
    server.use(
      http.post(`${origin}/api/auth/google`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBeNull()
        expect(await request.json()).toEqual({
          code: 'google-code',
          redirectUri: 'https://fellowa.test/auth/google/callback',
        })
        return HttpResponse.json(
          {
            data: {
              message: 'Successfully logged in',
              token: 'backend-token',
              user: { id: 4, email: 'creator@example.com', alias: null },
            },
            errors: null,
          },
          { status: 201 }
        )
      })
    )

    await expect(
      exchangeGoogleCode({
        code: 'google-code',
        redirectUri: 'https://fellowa.test/auth/google/callback',
      })
    ).resolves.toBe('backend-token')
  })

  it('uses the public token validation route and rejects invalid responses', async () => {
    server.use(
      http.post(`${origin}/api/auth/verify-token`, async ({ request }) => {
        expect(request.headers.get('authorization')).toBeNull()
        expect(await request.json()).toEqual({ token: 'candidate-token' })
        return HttpResponse.json(
          {
            data: {
              valid: true,
              payload: {
                sub: 4,
                email: 'creator@example.com',
                exp: 2_000_000_000,
              },
            },
            errors: null,
          },
          { status: 201 }
        )
      })
    )
    await expect(verifyAuthToken('candidate-token')).resolves.toBe(true)

    server.use(
      http.post(`${origin}/api/auth/verify-token`, () =>
        HttpResponse.json({ data: { valid: false }, errors: null })
      )
    )
    await expect(verifyAuthToken('candidate-token')).rejects.toMatchObject({
      name: 'InvalidAuthResponseError',
    })

    server.use(
      http.post(`${origin}/api/auth/verify-token`, () =>
        HttpResponse.json({ data: { valid: true }, errors: null })
      )
    )
    await expect(verifyAuthToken('candidate-token')).rejects.toMatchObject({
      name: 'InvalidAuthResponseError',
    })
  })
})
