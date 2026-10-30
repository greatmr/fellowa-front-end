import { act, screen, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from 'next-themes'
import { toast } from 'sonner'
import { afterEach, describe, expect, it } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import en from '../../../messages/en.json'
import fa from '../../../messages/fa.json'
import { renderWithIntl } from '../../../test/render'

afterEach(() => {
  toast.dismiss()
  localStorage.removeItem('theme')
  document.documentElement.classList.remove('light', 'dark', 'custom')
})

describe('branded notifications', () => {
  it.each([
    { theme: 'dark', resolved: 'dark' },
    { theme: 'system', resolved: 'light' },
    { theme: 'custom', resolved: 'light' },
  ])(
    'renders $theme using a supported Sonner theme',
    async ({ theme, resolved }) => {
      renderWithIntl(
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          themes={['light', 'dark', 'custom']}
          enableSystem
        >
          <Toaster />
        </ThemeProvider>
      )
      await act(async () => {
        toast.error('Could not save', { duration: Infinity })
      })

      const notification = await screen.findByText('Could not save')
      expect(notification.closest('ol')).toHaveAttribute(
        'data-sonner-theme',
        resolved
      )
    }
  )

  it('uses the system fallback when no theme provider is mounted', async () => {
    renderWithIntl(<Toaster />)
    await act(async () => {
      toast.info('Information', { duration: Infinity })
    })

    const notification = await screen.findByText('Information')
    expect(notification.closest('ol')).toHaveAttribute(
      'data-sonner-theme',
      'light'
    )
  })

  it('stacks at the bottom centre like the presentation toast', async () => {
    renderWithIntl(<Toaster />)
    await act(async () => {
      toast('Copied', { duration: Infinity })
    })

    const list = (await screen.findByText('Copied')).closest('ol')
    expect(list).toHaveAttribute('data-y-position', 'bottom')
    expect(list).toHaveAttribute('data-x-position', 'center')
  })

  it('keeps a caller-chosen position', async () => {
    renderWithIntl(<Toaster position="top-center" />)
    await act(async () => {
      toast('Copied', { duration: Infinity })
    })

    const list = (await screen.findByText('Copied')).closest('ol')
    expect(list).toHaveAttribute('data-y-position', 'top')
  })

  it.each([
    { tone: 'success', show: toast.success, tint: 'text-money-500' },
    { tone: 'error', show: toast.error, tint: 'text-red-500' },
    { tone: 'info', show: toast.info, tint: 'text-brand-400' },
    { tone: 'warning', show: toast.warning, tint: 'text-amber-500' },
  ])(
    'carries the $tone tone in a tinted icon, not the surface',
    async ({ tone, show, tint }) => {
      renderWithIntl(<Toaster />)
      await act(async () => {
        show(`${tone} message`, { duration: Infinity })
      })

      const item = (await screen.findByText(`${tone} message`)).closest('li')
      expect(item).toHaveAttribute('data-type', tone)
      expect(item?.querySelector('[data-icon] svg')).toHaveClass(tint)
    }
  )

  it('keeps the tone icons when a caller supplies another icon', async () => {
    renderWithIntl(<Toaster icons={{ loading: <span>loading</span> }} />)
    await act(async () => {
      toast.success('Saved', { duration: Infinity })
    })

    const item = (await screen.findByText('Saved')).closest('li')
    expect(item?.querySelector('[data-icon] svg')).toHaveClass('text-money-500')
  })

  it.each([
    { locale: 'fa', messages: fa, direction: 'rtl' },
    { locale: 'en', messages: en, direction: 'ltr' },
  ] as const)(
    'localizes its region and dismiss action in $locale',
    async ({ locale, messages, direction }) => {
      const user = userEvent.setup()
      renderWithIntl(
        <ThemeProvider attribute="class" defaultTheme="light">
          <Toaster richColors />
        </ThemeProvider>,
        { locale }
      )
      await act(async () => {
        toast.success('Saved', { duration: Infinity })
      })
      const notification = await screen.findByText('Saved')
      expect(
        screen.getByRole('region', {
          name: (name) => name.startsWith(messages.common.notifications),
        })
      ).toBeInTheDocument()
      expect(notification.closest('ol')).toHaveAttribute('dir', direction)
      const removed = waitForElementToBeRemoved(notification)
      await user.click(
        screen.getByRole('button', { name: messages.common.close })
      )
      await removed
    }
  )
})
