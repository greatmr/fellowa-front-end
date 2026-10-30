import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HttpResponse, http } from 'msw'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as I18nNavigation from '@/i18n/navigation'
import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { server } from '../../../../test/msw/server'
import { renderWithIntl } from '../../../../test/render'

// Nothing of ours is mocked between the screen and the network: the real hooks,
// server actions and API client run, and MSW answers as the backend does.
const request = vi.hoisted(() => ({
  origin: 'https://fellowa.test',
  cookie: '',
  replace: vi.fn(),
}))
vi.mock('next/server', () => ({ connection: async () => {} }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ origin: request.origin }),
  cookies: async () => ({
    get: () =>
      request.cookie
        ? { name: 'fellowa_session', value: request.cookie }
        : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  }),
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof I18nNavigation>()),
  useRouter: () => ({ replace: request.replace }),
}))

const apiOrigin = 'https://api.fellowa.test/api'
vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', apiOrigin)
vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://fellowa.test')
const { OnboardingFlow } = await import('./onboarding-flow')
const { loadOnboarding } = await import('../server/load-onboarding')
afterAll(() => vi.unstubAllEnvs())

// Fixed for the file: a token built from the clock on each call would differ
// across a second boundary, and the handlers compare tokens exactly.
const tokenExpiry = Math.floor(Date.now() / 1000) + 3600
const payload = Buffer.from(
  JSON.stringify({ sub: 42, exp: tokenExpiry })
).toString('base64url')
const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.backendSignature`

const sent: { path: string; body: unknown; auth: string | null }[] = []
const failure = (status: number, code: string) =>
  HttpResponse.json(
    { data: null, errors: [{ message: code, code }] },
    { status }
  )
const accepted = (message: string) =>
  HttpResponse.json({ data: { message }, errors: null })

async function record(r: Request) {
  sent.push({
    path: new URL(r.url).pathname.replace('/api', ''),
    body: await r.json(),
    auth: r.headers.get('authorization'),
  })
}

beforeEach(() => {
  request.origin = 'https://fellowa.test'
  request.cookie = token
  request.replace.mockReset()
  sent.length = 0
  server.use(
    http.get(`${apiOrigin}/user/42/profile`, () =>
      HttpResponse.json({
        data: {
          id: 42,
          email: 'me@example.com',
          alias: null,
          isVerified: true,
        },
        errors: null,
      })
    ),
    http.put(`${apiOrigin}/user/personal`, async ({ request: r }) => {
      await record(r)
      return accepted('Personal info updated')
    }),
    http.put(`${apiOrigin}/auth/alias`, async ({ request: r }) => {
      await record(r)
      return accepted('Alias set successfully')
    }),
    http.put(`${apiOrigin}/user/about`, async ({ request: r }) => {
      await record(r)
      return accepted('About info updated')
    })
  )
})

const noLinks = { instagramLink: null, youtubeLink: null, twitterLink: null }
type FlowProps = Parameters<typeof OnboardingFlow>[0]

function renderFlow(
  props: Partial<FlowProps> = {},
  locale: 'fa' | 'en' = 'en'
) {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return renderWithIntl(
    <QueryClientProvider client={client}>
      <OnboardingFlow
        viewerId={42}
        firstName=""
        lastName=""
        alias={null}
        links={noLinks}
        {...props}
      />
    </QueryClientProvider>,
    { locale }
  )
}

const named = { firstName: 'Sara' }
const atSocials = { firstName: 'Sara', alias: 'studio' }

async function toSocials(
  user: ReturnType<typeof userEvent.setup>,
  props: Partial<FlowProps> = {}
) {
  renderFlow({ ...atSocials, ...props })
  await user.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: en.onboarding.socials.title })
}

describe('name step', () => {
  it('holds Continue back until there is a first name', async () => {
    const user = userEvent.setup()
    renderFlow()

    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
    await user.type(screen.getByLabelText('First name'), 'Sara')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
  })

  it('sends only the two names, so a saved phone number is untouched', async () => {
    const user = userEvent.setup()
    renderFlow()

    await user.type(screen.getByLabelText('First name'), ' Sara ')
    await user.type(screen.getByLabelText('Last name'), 'Karimi')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByText('Step 2 of 3')
    expect(sent).toEqual([
      {
        path: '/user/personal',
        body: { firstName: 'Sara', lastName: 'Karimi' },
        auth: `Bearer ${token}`,
      },
    ])
  })

  it.each([
    ['too short', 'S', 'Your first name must be 2 to 60 characters.'],
    ['too long', 'S'.repeat(61), 'Your first name must be 2 to 60 characters.'],
  ])('refuses a first name that is %s', async (_name, value, message) => {
    const user = userEvent.setup()
    renderFlow()

    await user.type(screen.getByLabelText('First name'), value)
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(sent).toEqual([])
  })

  it('shows a failed save and stays on the step', async () => {
    server.use(
      http.put(`${apiOrigin}/user/personal`, () =>
        failure(500, 'INTERNAL_ERROR')
      )
    )
    const user = userEvent.setup()
    renderFlow()

    await user.type(screen.getByLabelText('First name'), 'Sara')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.onboarding.errors.saveFailed
    )
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument()
  })

  it('offers a way back in when the session has ended', async () => {
    request.cookie = ''
    const user = userEvent.setup()
    renderFlow()

    await user.type(screen.getByLabelText('First name'), 'Sara')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      await screen.findByRole('link', { name: 'Sign in again' })
    ).toHaveAttribute('href', '/en/auth/login?returnTo=%2Fonboarding')
    expect(sent).toEqual([])
  })
})

describe('username step', () => {
  it('starts here when the name is already saved, with Continue held back', () => {
    renderFlow(named)

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })

  it('never presents the username as an address (C-9)', async () => {
    const user = userEvent.setup()
    renderFlow(named)
    await user.type(screen.getByLabelText('Username'), 'studio')

    expect(document.body).not.toHaveTextContent(/fellowa\.ir|URL/i)
    for (const messages of [en, fa]) {
      expect(JSON.stringify(messages.onboarding)).not.toMatch(
        /fellowa\.ir|https?:|URL|آدرس صفحه/
      )
    }
  })

  it('shows the lowercase result and saves what was typed', async () => {
    const user = userEvent.setup()
    renderFlow(named)

    await user.type(screen.getByLabelText('Username'), 'Studio')
    expect(screen.getByText('studio').closest('p')).toHaveTextContent(
      'It will be saved as studio'
    )
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByText('Step 3 of 3')
    expect(sent).toEqual([
      {
        path: '/auth/alias',
        body: { alias: 'Studio' },
        auth: `Bearer ${token}`,
      },
    ])
    expect(screen.getByRole('status')).toHaveTextContent(
      'Your username was saved as studio'
    )
  })

  it('says nothing about case when the value is already lowercase', async () => {
    const user = userEvent.setup()
    renderFlow(named)

    await user.type(screen.getByLabelText('Username'), 'studio_9')

    expect(screen.queryByText(/It will be saved as/)).not.toBeInTheDocument()
  })

  it.each([
    ['too short', 'ab', 'Your username must be at least 3 characters.'],
    ['too long', 'a'.repeat(31), 'Your username can be at most 30 characters.'],
    [
      'bad characters',
      'bad-name',
      'Use English letters, numbers and underscore (_) only.',
    ],
    [
      'Persian letters',
      'نام_من',
      'Use English letters, numbers and underscore (_) only.',
    ],
    [
      'Persian digits',
      '۱۲۳۴',
      'Use English letters, numbers and underscore (_) only.',
    ],
  ])('refuses %s without asking the server', async (_name, value, message) => {
    const user = userEvent.setup()
    renderFlow(named)

    await user.type(screen.getByLabelText('Username'), value)
    expect(await screen.findByText(message)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()
    expect(sent).toEqual([])
  })

  it('shows taken as the answer to submit, and clears it on the next edit', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/alias`, () =>
        failure(409, 'AUTH_ALIAS_TAKEN')
      )
    )
    const user = userEvent.setup()
    renderFlow(named)

    await user.type(screen.getByLabelText('Username'), 'studio')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByText(en.onboarding.username.taken)).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Username'), '2')
    await waitFor(() =>
      expect(
        screen.queryByText(en.onboarding.username.taken)
      ).not.toBeInTheDocument()
    )
  })

  it('shows an upstream validation refusal on the field', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/alias`, () =>
        failure(400, 'VALIDATION_ERROR')
      )
    )
    const user = userEvent.setup()
    renderFlow(named)

    await user.type(screen.getByLabelText('Username'), 'studio')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(
      await screen.findByText(en.onboarding.username.rejected)
    ).toBeVisible()
  })

  it('shows a failed save as an error, not as taken', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/alias`, () => failure(500, 'INTERNAL_ERROR'))
    )
    const user = userEvent.setup()
    renderFlow(named)

    await user.type(screen.getByLabelText('Username'), 'studio')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.onboarding.errors.saveFailed
    )
    expect(
      screen.queryByText(en.onboarding.username.taken)
    ).not.toBeInTheDocument()
  })

  it('lets an unchanged username through, even one from before the rules', async () => {
    const user = userEvent.setup()
    renderFlow({ ...named, alias: 'Old-Name' })

    expect(screen.getByLabelText('Username')).toHaveValue('Old-Name')
    await user.click(screen.getByRole('button', { name: 'Continue' }))

    await screen.findByText('Step 3 of 3')
    expect(sent).toEqual([])
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('goes back to the name step with what was saved', async () => {
    const user = userEvent.setup()
    renderFlow({ firstName: 'Sara', lastName: 'Karimi' })

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByLabelText('First name')).toHaveValue('Sara')
    expect(screen.getByLabelText('Last name')).toHaveValue('Karimi')
  })
})

describe('socials step', () => {
  it('offers only the platforms the backend has a field for', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    for (const platform of ['Instagram', 'YouTube', 'X']) {
      expect(
        screen.getByRole('button', { name: `Add ${platform}` })
      ).toBeInTheDocument()
    }
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(document.body).not.toHaveTextContent(/Telegram|Aparat/)
  })

  it('saves the added link in one request and leaves for the studio', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add Instagram' }))
    await user.type(screen.getByLabelText('Instagram address'), '@my_studio')
    await user.click(screen.getByRole('button', { name: 'Add Instagram' }))
    expect(screen.getByText('instagram.com/my_studio')).toBeInTheDocument()
    expect(sent).toEqual([])

    await user.click(screen.getByRole('button', { name: 'Finish' }))

    await waitFor(() => expect(request.replace).toHaveBeenCalledWith('/studio'))
    expect(sent).toEqual([
      {
        path: '/user/about',
        body: {
          instagramLink: 'https://www.instagram.com/my_studio',
          youtubeLink: null,
          twitterLink: null,
        },
        auth: `Bearer ${token}`,
      },
    ])
  })

  it('refuses an address it cannot read, and keeps the row open', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add X' }))
    await user.type(screen.getByLabelText('X address'), 'نام کاربری')
    await user.keyboard('{Enter}')

    expect(screen.getByText(en.onboarding.socials.invalid)).toBeInTheDocument()
    expect(screen.getByLabelText('X address')).toHaveAttribute(
      'aria-invalid',
      'true'
    )

    await user.clear(screen.getByLabelText('X address'))
    expect(
      screen.queryByText(en.onboarding.socials.invalid)
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByLabelText('X address')).not.toBeInTheDocument()
  })

  it('saves text left in an open row rather than losing it', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add YouTube' }))
    await user.type(screen.getByLabelText('YouTube address'), 'my_studio')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    await waitFor(() => expect(request.replace).toHaveBeenCalled())
    expect(sent[0]?.body).toMatchObject({
      youtubeLink: 'https://www.youtube.com/@my_studio',
    })
  })

  it('stops Finish on invalid text left in an open row', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add YouTube' }))
    await user.type(screen.getByLabelText('YouTube address'), 'no good')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(screen.getByText(en.onboarding.socials.invalid)).toBeInTheDocument()
    expect(request.replace).not.toHaveBeenCalled()
    expect(sent).toEqual([])
  })

  it('skipping saves nothing, even a link just added', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add X' }))
    await user.type(screen.getByLabelText('X address'), 'my_studio')
    await user.click(screen.getByRole('button', { name: 'Add X' }))
    await user.click(screen.getByRole('button', { name: 'Skip for now' }))

    expect(request.replace).toHaveBeenCalledWith('/studio')
    expect(sent).toEqual([])
  })

  it('finishing with nothing changed sends nothing', async () => {
    const user = userEvent.setup()
    await toSocials(user, {
      links: { ...noLinks, twitterLink: 'https://twitter.com/old' },
    })

    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(request.replace).toHaveBeenCalledWith('/studio')
    expect(sent).toEqual([])
  })

  it('keeps a stored link as it is and clears a removed one with null', async () => {
    const user = userEvent.setup()
    await toSocials(user, {
      links: {
        instagramLink: 'https://instagram.com/old/channel',
        youtubeLink: 'https://www.youtube.com/channel/UC1',
        twitterLink: null,
      },
    })

    expect(screen.getByText('youtube.com/channel/UC1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove Instagram' }))
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    await waitFor(() => expect(request.replace).toHaveBeenCalled())
    expect(sent[0]?.body).toEqual({
      instagramLink: null,
      youtubeLink: 'https://www.youtube.com/channel/UC1',
      twitterLink: null,
    })
  })

  it('still saves a link added before going back a step', async () => {
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add X' }))
    await user.type(screen.getByLabelText('X address'), 'my_studio')
    await user.click(screen.getByRole('button', { name: 'Add X' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Continue' }))
    await screen.findByText('x.com/my_studio')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    await waitFor(() => expect(request.replace).toHaveBeenCalled())
    expect(sent[0]?.body).toMatchObject({
      twitterLink: 'https://x.com/my_studio',
    })
  })

  it('an account with no about record fails to save, and can still skip', async () => {
    server.use(
      http.put(`${apiOrigin}/user/about`, () =>
        failure(404, 'USER_ABOUT_NOT_FOUND')
      )
    )
    const user = userEvent.setup()
    await toSocials(user)

    await user.click(screen.getByRole('button', { name: 'Add X' }))
    await user.type(screen.getByLabelText('X address'), 'my_studio')
    await user.click(screen.getByRole('button', { name: 'Finish' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.onboarding.errors.saveFailed
    )
    expect(request.replace).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(request.replace).toHaveBeenCalledWith('/studio')
  })
})

describe('not a gate (CP-01)', () => {
  it.each([
    ['name', {}],
    ['username', named],
  ])('can be left from the %s step', (_name, props) => {
    renderFlow(props)
    expect(
      screen.getByRole('link', { name: 'Back to studio' })
    ).toHaveAttribute('href', '/en/studio')
  })
})

describe('Persian', () => {
  it('renders Persian copy and digits', () => {
    renderFlow(named, 'fa')

    expect(screen.getByText('قدم ۲ از ۳')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: fa.onboarding.username.title })
    ).toBeInTheDocument()
    expect(
      screen.getByText('۳ تا ۳۰ کاراکتر؛ فقط حروف انگلیسی، عدد و زیرخط (_).')
    ).toBeInTheDocument()
  })

  it('shows the validation and taken answers in Persian', async () => {
    server.use(
      http.put(`${apiOrigin}/auth/alias`, () =>
        failure(409, 'AUTH_ALIAS_TAKEN')
      )
    )
    const user = userEvent.setup()
    renderFlow(named, 'fa')
    const input = screen.getByLabelText(fa.onboarding.username.label)

    await user.type(input, 'ab')
    expect(
      await screen.findByText('نام کاربری باید حداقل ۳ کاراکتر باشد.')
    ).toBeInTheDocument()

    await user.type(input, 'c')
    await user.click(
      screen.getByRole('button', { name: fa.onboarding.continue })
    )
    expect(await screen.findByText(fa.onboarding.username.taken)).toBeVisible()
  })
})

describe('loadOnboarding', () => {
  const session = {
    token,
    expiresAt: new Date(tokenExpiry * 1000),
    user: {
      id: 42,
      email: 'me@example.com',
      alias: 'studio',
      isVerified: true,
    },
  }

  it('starts empty for an account with no personal or about record', async () => {
    server.use(
      http.get(`${apiOrigin}/user/personal`, () =>
        failure(404, 'USER_PERSONAL_NOT_FOUND')
      ),
      http.get(`${apiOrigin}/user/about`, () =>
        failure(404, 'USER_ABOUT_NOT_FOUND')
      )
    )

    expect(await loadOnboarding(session)).toEqual({
      viewerId: 42,
      alias: 'studio',
      firstName: '',
      lastName: '',
      links: noLinks,
    })
  })

  it('keeps the phone number out of what reaches the browser', async () => {
    server.use(
      http.get(`${apiOrigin}/user/personal`, () =>
        HttpResponse.json({
          data: {
            firstName: 'Sara',
            lastName: null,
            phoneNumber: '09120000000',
          },
          errors: null,
        })
      ),
      http.get(`${apiOrigin}/user/about`, () =>
        HttpResponse.json({
          data: { bio: 'Hello', instagramLink: 'https://instagram.com/s' },
          errors: null,
        })
      )
    )

    const data = await loadOnboarding(session)

    expect(data).toEqual({
      viewerId: 42,
      alias: 'studio',
      firstName: 'Sara',
      lastName: '',
      links: { ...noLinks, instagramLink: 'https://instagram.com/s' },
    })
    expect(JSON.stringify(data)).not.toContain('0912')
  })

  it('does not hide a real failure as an empty form', async () => {
    server.use(
      http.get(`${apiOrigin}/user/personal`, () =>
        failure(500, 'INTERNAL_ERROR')
      ),
      http.get(`${apiOrigin}/user/about`, () =>
        failure(404, 'USER_ABOUT_NOT_FOUND')
      )
    )

    await expect(loadOnboarding(session)).rejects.toMatchObject({ status: 500 })
  })
})

describe('server boundary', () => {
  it('refuses another origin before any save', async () => {
    const { saveNamesAction } = await import('../server/actions')
    request.origin = 'https://attacker.example'

    expect(
      await saveNamesAction(42, { firstName: 'Sara', lastName: '' })
    ).toEqual({ ok: false, status: 403, code: 'INVALID_REQUEST' })
    expect(sent).toEqual([])
  })

  it('refuses a different account in the cookie', async () => {
    const { saveSocialLinksAction } = await import('../server/actions')

    expect(await saveSocialLinksAction(7, noLinks)).toEqual({
      ok: false,
      status: 401,
      code: 'SESSION_CHANGED',
    })
    expect(sent).toEqual([])
  })

  it('re-checks what reaches the API', async () => {
    const { saveNamesAction, saveSocialLinksAction } =
      await import('../server/actions')

    expect(
      await saveNamesAction(42, { firstName: 'S', lastName: '' })
    ).toMatchObject({ ok: false, status: 400 })
    expect(
      await saveSocialLinksAction(42, {
        ...noLinks,
        twitterLink: 'javascript:alert(1)',
      })
    ).toMatchObject({ ok: false, status: 400 })
    expect(sent).toEqual([])
  })
})
