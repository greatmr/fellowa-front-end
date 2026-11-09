import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState, type ComponentProps } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import en from '../../../../messages/en.json'
import { AuthFlowProvider, useAuthFlow } from './auth-flow-context'
import { CompleteAccountForm } from './complete-account-form'
import { PhoneAuthFlow, type PhoneStep } from './phone-auth-flow'
import { renderAuth } from './test-utils'

const mocked = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  /** The harness's "router": moves it to another step route. */
  go: null as null | ((href: unknown) => void),
  actions: {
    requestPhoneCodeForHook: vi.fn(),
    verifyPhoneCodeForHook: vi.fn(),
    phoneLoginForHook: vi.fn(),
    completeAccountForHook: vi.fn(),
  },
}))
vi.mock('@/features/auth/server/hook-actions', () => mocked.actions)
vi.mock('@/features/auth/server/google-actions', () => ({
  startGoogleSignInAction: vi.fn(),
}))
vi.mock('@/i18n/navigation', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useRouter: () => ({
    replace: (href: unknown) => {
      mocked.replace(href)
      mocked.go?.(href)
    },
    push: (href: unknown) => {
      mocked.push(href)
      mocked.go?.(href)
    },
  }),
}))

const STEP_PATHS: Record<string, PhoneStep> = {
  '/auth': 'entry',
  '/auth/otp': 'otp',
  '/auth/password': 'password',
}
const pathOf = (href: unknown) =>
  typeof href === 'object' && href !== null && 'pathname' in href
    ? String(href.pathname)
    : String(href)

/** The per-step routes, as the auth layout and the App Router hold them. */
function Routes({
  start = '/auth',
  ...props
}: Omit<ComponentProps<typeof PhoneAuthFlow>, 'step'> & { start?: string }) {
  const [path, setPath] = useState(start)
  useEffect(() => {
    mocked.go = (href) => setPath(pathOf(href))
    return () => {
      mocked.go = null
    }
  }, [])
  const step = STEP_PATHS[path]
  return step ? (
    <PhoneAuthFlow step={step} {...props} />
  ) : (
    <p data-testid="left">{path}</p>
  )
}

function renderFlow(props: ComponentProps<typeof Routes> = {}) {
  return renderAuth(
    <AuthFlowProvider>
      <Routes {...props} />
    </AuthFlowProvider>
  )
}

const t = en.auth.phone
const phone = '09121234567'

const sent = (hasPassword = false) => ({
  ok: true,
  data: {
    phone,
    hasAccount: hasPassword,
    hasPassword,
    resendAfterSeconds: 120,
    expiresInSeconds: 120,
  },
})
const signIn = (isNewUser: boolean, needsProfile = isNewUser) => ({
  ok: true,
  data: {
    user: { id: 77, email: null, alias: null, isVerified: true },
    phone,
    isNewUser,
    needsProfile,
    hasPassword: false,
  },
})
const fail = (status: number, code: string, retryAfterSeconds?: number) => ({
  ok: false,
  status,
  code,
  isNetworkError: false,
  ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
})

beforeEach(() => {
  vi.clearAllMocks()
  mocked.actions.requestPhoneCodeForHook.mockResolvedValue(sent())
  mocked.actions.verifyPhoneCodeForHook.mockResolvedValue(signIn(false))
  mocked.actions.phoneLoginForHook.mockResolvedValue(signIn(false))
  mocked.actions.completeAccountForHook.mockResolvedValue({
    ok: true,
    data: { hasPassword: false },
  })
})

afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
}

async function toCodeScreen(user: ReturnType<typeof setup>, returnTo?: string) {
  renderFlow({ returnTo })
  await user.type(screen.getByLabelText(t.entry.label), '۰۹۱۲ ۱۲۳ ۴۵۶۷')
  await user.click(screen.getByRole('button', { name: t.entry.submit }))
  await screen.findByRole('heading', { name: t.code.title })
}

const digitBoxes = () =>
  [1, 2, 3, 4, 5].map((index) => screen.getByLabelText(`Digit ${index} of 5`))

describe('phone entry (LoginOrSignupScreen)', () => {
  it('waits for a valid number, and sends it normalised', async () => {
    const user = setup()
    renderFlow()
    const submit = screen.getByRole('button', { name: t.entry.submit })
    expect(submit).toBeDisabled()
    await user.type(screen.getByLabelText(t.entry.label), '0912')
    expect(submit).toBeDisabled()
    await user.tab()
    expect(await screen.findByText(t.validation.phone)).toBeInTheDocument()
    await user.clear(screen.getByLabelText(t.entry.label))
    await user.type(screen.getByLabelText(t.entry.label), '+98 912 123 4567')
    await user.click(submit)
    await screen.findByRole('heading', { name: t.code.title })
    expect(mocked.actions.requestPhoneCodeForHook).toHaveBeenCalledWith({
      phone,
    })
    expect(screen.getByText('0912 123 4567')).toBeInTheDocument()
  })

  it('offers the password screen when the account has one', async () => {
    const user = setup()
    mocked.actions.requestPhoneCodeForHook.mockResolvedValue(sent(true))
    renderFlow()
    await user.type(screen.getByLabelText(t.entry.label), phone)
    await user.click(screen.getByRole('button', { name: t.entry.submit }))
    expect(
      await screen.findByRole('heading', { name: t.password.title })
    ).toBeInTheDocument()
  })

  it.each([
    [fail(409, 'USER_PHONE_TAKEN'), t.errors.phoneTaken],
    [fail(400, 'AUTH_PHONE_INVALID'), t.errors.phoneInvalid],
    [
      fail(429, 'AUTH_CODE_RATE_LIMITED', 42),
      t.errors.codeRateLimited.replace('{time}', '0:42'),
    ],
    [fail(429, 'AUTH_CODE_RATE_LIMITED'), t.errors.codeRateLimitedNoTime],
    [
      fail(429, 'AUTH_CODE_TOO_MANY_ATTEMPTS', 900),
      t.errors.codeLocked.replace('{time}', '15:00'),
    ],
    [fail(503, 'AUTH_SMS_UNAVAILABLE'), t.errors.smsUnavailable],
    [
      { ok: false, code: 'NETWORK', isNetworkError: true },
      en.auth.errors.network,
    ],
  ])('shows %o as its own message and stays', async (result, message) => {
    const user = setup()
    mocked.actions.requestPhoneCodeForHook.mockResolvedValue(result)
    renderFlow()
    await user.type(screen.getByLabelText(t.entry.label), phone)
    await user.click(screen.getByRole('button', { name: t.entry.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(
      screen.getByRole('heading', { name: t.entry.title })
    ).toBeInTheDocument()
  })

  it('keeps the email sign-in reachable', () => {
    renderFlow({ returnTo: '/settings' })
    expect(
      screen.getByRole('link', { name: t.entry.emailLink })
    ).toHaveAttribute(
      'href',
      expect.stringContaining('/auth/login/email?returnTo=%2Fsettings')
    )
    expect(
      screen.queryByRole('button', { name: /google/i })
    ).not.toBeInTheDocument()
  })
})

describe('per-step routes (AuthContainer)', () => {
  it('moves to /auth/otp with the destination, then signs in back to it', async () => {
    const user = setup()
    await toCodeScreen(user, '/creators/5')
    expect(mocked.push).toHaveBeenCalledWith({
      pathname: '/auth/otp',
      query: { returnTo: '/creators/5' },
    })
  })

  it('sends a code or password route reached without a number back to /auth', async () => {
    renderFlow({ start: '/auth/otp', returnTo: '/creators/5' })
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith({
        pathname: '/auth',
        query: { returnTo: '/creators/5' },
      })
    )
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('opens /auth/password for an account with a password', async () => {
    const user = setup()
    mocked.actions.requestPhoneCodeForHook.mockResolvedValue(sent(true))
    renderFlow()
    await user.type(screen.getByLabelText(t.entry.label), phone)
    await user.click(screen.getByRole('button', { name: t.entry.submit }))
    expect(mocked.push).toHaveBeenCalledWith('/auth/password')
  })
})

describe('Google on the entry screen', () => {
  const google = { enabled: true, locale: 'en', error: null }

  it('comes first, above the "or with your mobile" divider', () => {
    renderFlow({ google, returnTo: '/creators/5' })
    const button = screen.getByRole('button', {
      name: new RegExp(t.entry.googleTitle),
    })
    const divider = screen.getByText(t.entry.divider)
    const phoneField = screen.getByLabelText(t.entry.label)
    expect(
      button.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      divider.compareDocumentPosition(phoneField) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.getByText(t.entry.descriptionWithGoogle)).toBeInTheDocument()
    const form = button.closest('form')
    expect(form?.querySelector('input[name="returnTo"]')).toHaveValue(
      '/creators/5'
    )
    expect(form?.querySelector('input[name="locale"]')).toHaveValue('en')
  })

  it('is absent when Google is not configured', () => {
    renderFlow({ google: { ...google, enabled: false } })
    expect(
      screen.queryByRole('button', { name: new RegExp(t.entry.googleTitle) })
    ).not.toBeInTheDocument()
    expect(screen.queryByText(t.entry.divider)).not.toBeInTheDocument()
    expect(screen.getByText(t.entry.description)).toBeInTheDocument()
  })

  it.each([
    ['failed', t.googleErrors.failed],
    ['emailNotVerified', t.googleErrors.emailNotVerified],
    ['usePassword', t.googleErrors.usePassword],
    ['alreadyLinked', t.googleErrors.alreadyLinked],
  ] as const)('explains a %s Google sign-in', (error, message) => {
    renderFlow({ google: { ...google, error } })
    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })
})

describe('code (VerifyCodeScreen)', () => {
  it('submits on its own once all five digits are typed', async () => {
    const user = setup()
    await toCodeScreen(user, '/creators/5')
    await user.type(digitBoxes()[0]!, '12345')
    await waitFor(() =>
      expect(mocked.actions.verifyPhoneCodeForHook).toHaveBeenCalledWith({
        phone,
        code: '12345',
      })
    )
    // An existing account goes where it was going.
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/creators/5')
    )
  })

  it('takes a pasted code in Persian digits and submits it', async () => {
    const user = setup()
    await toCodeScreen(user)
    digitBoxes()[0]!.focus()
    await user.paste('کد: ۵۴۳۲۱')
    await waitFor(() =>
      expect(mocked.actions.verifyPhoneCodeForHook).toHaveBeenCalledWith({
        phone,
        code: '54321',
      })
    )
  })

  it('takes a one-time-code autofill landing in the first box', async () => {
    const user = setup()
    await toCodeScreen(user)
    fireEvent.change(digitBoxes()[0]!, { target: { value: '11223' } })
    await waitFor(() =>
      expect(mocked.actions.verifyPhoneCodeForHook).toHaveBeenCalledWith({
        phone,
        code: '11223',
      })
    )
  })

  it('sends a new account to complete its profile', async () => {
    const user = setup()
    mocked.actions.verifyPhoneCodeForHook.mockResolvedValue(signIn(true))
    await toCodeScreen(user, '/creators/5')
    await user.type(digitBoxes()[0]!, '12345')
    // The destination travels with it (FQ-17: back to the page after).
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith({
        pathname: '/auth/account',
        query: { returnTo: '/creators/5' },
      })
    )
  })

  it('shakes, clears and says so on a wrong code', async () => {
    const user = setup()
    mocked.actions.verifyPhoneCodeForHook.mockResolvedValue(
      fail(400, 'AUTH_CODE_INVALID')
    )
    await toCodeScreen(user)
    await user.type(digitBoxes()[0]!, '12345')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.codeInvalid
    )
    expect(digitBoxes()[0]!.parentElement).toHaveAttribute('data-shake')
    for (const box of digitBoxes()) expect(box).toHaveValue('')
    expect(mocked.replace).not.toHaveBeenCalled()
  })

  it('asks for a new code when the code expired', async () => {
    const user = setup()
    mocked.actions.verifyPhoneCodeForHook.mockResolvedValue(
      fail(400, 'AUTH_CODE_EXPIRED')
    )
    await toCodeScreen(user)
    await user.type(digitBoxes()[0]!, '12345')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.codeExpired
    )
  })

  it('locks entry on too many attempts until a new code is sent', async () => {
    const user = setup()
    mocked.actions.verifyPhoneCodeForHook.mockResolvedValue(
      fail(429, 'AUTH_CODE_TOO_MANY_ATTEMPTS', 300)
    )
    await toCodeScreen(user)
    await user.type(digitBoxes()[0]!, '12345')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.codeLocked.replace('{time}', '5:00')
    )
    for (const box of digitBoxes()) expect(box).toBeDisabled()
    // The resend wait follows the lockout, not the 120 s cooldown.
    expect(
      screen.getByText(t.code.resendIn.replace('{time}', '5:00'))
    ).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(300_000))
    await user.click(screen.getByRole('button', { name: t.code.resend }))
    await waitFor(() => {
      for (const box of digitBoxes()) expect(box).toBeEnabled()
    })
  })

  it('counts down 120 s before a new code can be asked for', async () => {
    const user = setup()
    await toCodeScreen(user)
    expect(
      screen.getByText(t.code.resendIn.replace('{time}', '2:00'))
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: t.code.resend })
    ).not.toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(61_000))
    expect(
      screen.getByText(t.code.resendIn.replace('{time}', '0:59'))
    ).toBeInTheDocument()
    await act(() => vi.advanceTimersByTimeAsync(59_000))
    await user.click(screen.getByRole('button', { name: t.code.resend }))
    expect(await screen.findByRole('status')).toHaveTextContent(t.code.sent)
    expect(mocked.actions.requestPhoneCodeForHook).toHaveBeenCalledTimes(2)
    expect(
      screen.getByText(t.code.resendIn.replace('{time}', '2:00'))
    ).toBeInTheDocument()
  })

  it('restarts the wait from the seconds a rate-limited resend gives', async () => {
    const user = setup()
    await toCodeScreen(user)
    await act(() => vi.advanceTimersByTimeAsync(120_000))
    mocked.actions.requestPhoneCodeForHook.mockResolvedValue(
      fail(429, 'AUTH_CODE_RATE_LIMITED', 30)
    )
    await user.click(screen.getByRole('button', { name: t.code.resend }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.codeRateLimited.replace('{time}', '0:30')
    )
    expect(
      screen.getByText(t.code.resendIn.replace('{time}', '0:30'))
    ).toBeInTheDocument()
  })

  it('returns to the fresh code for the same number without a new request', async () => {
    const user = setup()
    await toCodeScreen(user)
    await user.click(screen.getByRole('button', { name: t.code.editNumber }))
    await user.click(screen.getByRole('button', { name: t.entry.submit }))
    await screen.findByRole('heading', { name: t.code.title })
    expect(mocked.actions.requestPhoneCodeForHook).toHaveBeenCalledTimes(1)
    // Once the wait is over, the same number asks for a new code.
    await user.click(screen.getByRole('button', { name: t.code.editNumber }))
    await act(() => vi.advanceTimersByTimeAsync(120_000))
    await user.click(screen.getByRole('button', { name: t.entry.submit }))
    await screen.findByRole('heading', { name: t.code.title })
    expect(mocked.actions.requestPhoneCodeForHook).toHaveBeenCalledTimes(2)
  })

  it('goes back to edit the number', async () => {
    const user = setup()
    await toCodeScreen(user)
    await user.click(screen.getByRole('button', { name: t.code.editNumber }))
    expect(screen.getByLabelText(t.entry.label)).toHaveValue(phone)
  })
})

describe('password (PhonePasswordLoginScreen)', () => {
  async function toPasswordScreen(user: ReturnType<typeof setup>) {
    mocked.actions.requestPhoneCodeForHook.mockResolvedValue(sent(true))
    renderFlow()
    await user.type(screen.getByLabelText(t.entry.label), phone)
    await user.click(screen.getByRole('button', { name: t.entry.submit }))
    await screen.findByRole('heading', { name: t.password.title })
  }

  it('signs in and goes to the studio', async () => {
    const user = setup()
    await toPasswordScreen(user)
    await user.type(screen.getByLabelText(t.password.label), 'a-password')
    await user.click(screen.getByRole('button', { name: t.password.submit }))
    await waitFor(() => expect(mocked.replace).toHaveBeenCalledWith('/studio'))
    expect(mocked.actions.phoneLoginForHook).toHaveBeenCalledWith({
      phone,
      password: 'a-password',
    })
  })

  it('says a wrong password can be replaced by a code', async () => {
    const user = setup()
    mocked.actions.phoneLoginForHook.mockResolvedValue(
      fail(401, 'AUTH_INVALID_CREDENTIALS')
    )
    await toPasswordScreen(user)
    await user.type(screen.getByLabelText(t.password.label), 'wrong')
    await user.click(screen.getByRole('button', { name: t.password.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.invalidCredentials
    )
  })

  it('uses the code already sent while it is fresh, and asks again after', async () => {
    const user = setup()
    await toPasswordScreen(user)
    await user.click(screen.getByRole('button', { name: t.password.sendCode }))
    await screen.findByRole('heading', { name: t.code.title })
    expect(mocked.actions.requestPhoneCodeForHook).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: t.code.usePassword }))
    await act(() => vi.advanceTimersByTimeAsync(121_000))
    await user.click(screen.getByRole('button', { name: t.password.useCode }))
    await screen.findByRole('heading', { name: t.code.title })
    expect(mocked.actions.requestPhoneCodeForHook).toHaveBeenCalledTimes(2)
  })
})

/** The account step, with what the code step left in the flow's memory. */
function renderAccount({
  next = '/auth/url',
  firstOfSteps = true,
  signedInPhone = null,
}: {
  next?: ComponentProps<typeof CompleteAccountForm>['next']
  firstOfSteps?: boolean
  signedInPhone?: string | null
} = {}) {
  function Seeded() {
    const flow = useAuthFlow()
    const { setSignedInPhone } = flow
    useEffect(() => {
      setSignedInPhone(signedInPhone)
    }, [setSignedInPhone])
    return flow.signedInPhone === signedInPhone ? (
      <CompleteAccountForm next={next} firstOfSteps={firstOfSteps} />
    ) : null
  }
  return renderAuth(
    <AuthFlowProvider>
      <Seeded />
    </AuthFlowProvider>
  )
}

describe('complete account (CompleteAccountScreen)', () => {
  it('shows the verified number and the page-name hint (FQ-17)', async () => {
    renderAccount({ signedInPhone: phone })
    expect(await screen.findByText('0912 123 4567')).toBeInTheDocument()
    expect(screen.getByText(/Your mobile number:/)).toBeInTheDocument()
    expect(screen.getByText(t.account.nameHint)).toBeInTheDocument()
  })

  it('without the number (a reload), shows the prototype fallback line', async () => {
    renderAccount()
    expect(await screen.findByText(t.account.description)).toBeInTheDocument()
  })

  it('goes back to the page it started from, with no step count', async () => {
    const user = setup()
    renderAccount({ next: '/creators/5', firstOfSteps: false })
    await user.type(await screen.findByLabelText(t.account.nameLabel), 'Sara')
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: t.account.skip }))
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/creators/5')
    )
  })

  it('sends the name without a password on skip, then the address step', async () => {
    const user = setup()
    renderAccount()
    expect(await screen.findByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '1'
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuemax',
      '2'
    )
    const skip = screen.getByRole('button', { name: t.account.skip })
    expect(skip).toBeDisabled()
    await user.type(
      await screen.findByLabelText(t.account.nameLabel),
      '  Sara '
    )
    await user.click(skip)
    await waitFor(() =>
      expect(mocked.replace).toHaveBeenCalledWith('/auth/url')
    )
    expect(mocked.actions.completeAccountForHook).toHaveBeenCalledWith({
      displayName: 'Sara',
    })
  })

  it('asks for a name before the skip link does anything', async () => {
    const user = setup()
    renderAccount()
    await user.click(
      await screen.findByRole('button', { name: t.account.skipLink })
    )
    expect(
      await screen.findByText(
        t.validation.displayNameLength
          .replace('{min}', '2')
          .replace('{max}', '80')
      )
    ).toBeInTheDocument()
    expect(mocked.actions.completeAccountForHook).not.toHaveBeenCalled()
  })

  it('holds the password to the API minimum of 8', async () => {
    const user = setup()
    renderAccount()
    await user.type(await screen.findByLabelText(t.account.nameLabel), 'Sara')
    await user.type(screen.getByLabelText(/^Password/), 'sixsix')
    await user.click(screen.getByRole('button', { name: t.account.submit }))
    expect(
      await screen.findByText(t.validation.passwordLength.replace('{min}', '8'))
    ).toBeInTheDocument()
    expect(mocked.actions.completeAccountForHook).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText(/^Password/), '78')
    await user.click(screen.getByRole('button', { name: t.account.submit }))
    await waitFor(() =>
      expect(mocked.actions.completeAccountForHook).toHaveBeenCalledWith({
        displayName: 'Sara',
        password: 'sixsix78',
      })
    )
  })

  it('explains an account that already has a password', async () => {
    const user = setup()
    mocked.actions.completeAccountForHook.mockResolvedValue(
      fail(409, 'AUTH_PASSWORD_ALREADY_SET')
    )
    renderAccount()
    await user.type(await screen.findByLabelText(t.account.nameLabel), 'Sara')
    await user.type(screen.getByLabelText(/^Password/), 'longer-pw')
    await user.click(screen.getByRole('button', { name: t.account.submit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      t.errors.passwordAlreadySet
    )
    expect(mocked.replace).not.toHaveBeenCalled()
  })

  it('treats a vanished account as an ended session', async () => {
    const user = setup()
    mocked.actions.completeAccountForHook.mockResolvedValue(
      fail(404, 'USER_NOT_FOUND')
    )
    renderAccount()
    await user.type(await screen.findByLabelText(t.account.nameLabel), 'Sara')
    await user.click(screen.getByRole('button', { name: t.account.skip }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      en.auth.sessionExpired.title
    )
  })
})
