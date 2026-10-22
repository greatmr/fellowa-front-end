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
})

describe('branded notifications', () => {
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
