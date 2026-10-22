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
