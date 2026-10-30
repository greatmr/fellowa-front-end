import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Money, useFormatMoney } from '@/components/common/money'
import { renderWithIntl } from '../../../test/render'

function Formatted({ amount }: { amount: number }) {
  const formatMoney = useFormatMoney()
  return <p>{formatMoney(amount)}</p>
}

const cases = [
  { amount: 50000, fa: '۵۰٬۰۰۰ تومان', en: '50,000 Toman' },
  { amount: 0, fa: '۰ تومان', en: '0 Toman' },
  { amount: 999, fa: '۹۹۹ تومان', en: '999 Toman' },
  {
    amount: 9_999_999_999,
    fa: '۹٬۹۹۹٬۹۹۹٬۹۹۹ تومان',
    en: '9,999,999,999 Toman',
  },
] as const

describe('useFormatMoney', () => {
  it.each(cases)('formats $amount in fa and en', ({ amount, fa, en }) => {
    const first = renderWithIntl(<Formatted amount={amount} />, {
      locale: 'fa',
    })
    expect(screen.getByText(fa)).toBeInTheDocument()
    first.unmount()

    renderWithIntl(<Formatted amount={amount} />, { locale: 'en' })
    expect(screen.getByText(en)).toBeInTheDocument()
  })

  it('never rounds: a non-integer amount shows as it arrived', () => {
    renderWithIntl(<Formatted amount={1234.5678} />, { locale: 'en' })
    expect(screen.getByText('1,234.5678 Toman')).toBeInTheDocument()
  })
})

describe('Money', () => {
  it.each(cases)('renders the same text for $amount', ({ amount, fa, en }) => {
    const first = renderWithIntl(
      <p data-testid="money">
        <Money amountToman={amount} />
      </p>,
      { locale: 'fa' }
    )
    expect(screen.getByTestId('money')).toHaveTextContent(fa)
    first.unmount()

    renderWithIntl(
      <p data-testid="money">
        <Money amountToman={amount} />
      </p>,
      { locale: 'en' }
    )
    expect(screen.getByTestId('money')).toHaveTextContent(en)
  })

  it('puts the unit in its own element for separate styling', () => {
    renderWithIntl(
      <p>
        <Money amountToman={50000} unitClassName="text-body" />
      </p>,
      { locale: 'en' }
    )
    expect(screen.getByText('Toman')).toHaveClass('text-body')
    expect(screen.getByText('50,000').closest('p')).toHaveTextContent(
      '50,000 Toman'
    )
  })
})
