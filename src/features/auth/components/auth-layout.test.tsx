import { screen } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { describe, expect, it } from 'vitest'

import en from '../../../../messages/en.json'
import fa from '../../../../messages/fa.json'
import { AuthLayout } from './auth-layout'
import { renderAuth } from './test-utils'

describe('AuthLayout composition', () => {
  it.each([
    { locale: 'en', messages: en, home: '/en' },
    { locale: 'fa', messages: fa, home: '/' },
  ] as const)(
    'offers a content landmark, home navigation, and existing theme switch in $locale',
    ({ locale, messages, home }) => {
      renderAuth(
        <ThemeProvider>
          <AuthLayout>
            <h1>{messages.auth.login.title}</h1>
          </AuthLayout>
        </ThemeProvider>,
        { locale }
      )
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
      expect(
        screen.getByRole('link', { name: messages.common.skipToContent })
      ).toHaveAttribute('href', '#main-content')
      expect(
        screen.getAllByRole('link', { name: messages.auth.layout.home })
      ).toHaveLength(2)
      expect(
        screen.getAllByRole('link', { name: messages.auth.layout.home })[0]
      ).toHaveAttribute('href', home)
      expect(
        screen.getByRole('radiogroup', { name: messages.theme.label })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { name: messages.auth.layout.brandTitle })
      ).toBeInTheDocument()
    }
  )
})
