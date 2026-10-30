import { useFormatter, useTranslations } from 'next-intl'

/**
 * The one place money becomes text (FE-FND-07). Display only: the amount is
 * integer Toman resolved by the backend, and nothing here computes, scales or
 * rounds it. Persian digits and grouping come from next-intl's formatter for
 * the active locale; the unit and its position come from `common.money`.
 *
 * Both exports work in client components and in non-async server components.
 * An async server component renders `<Money />`.
 */

/**
 * Intl rounds to three fraction digits by default. A non-integer amount would
 * be a contract defect, so it is shown as it arrived rather than rounded away.
 */
const AMOUNT_FORMAT = { maximumFractionDigits: 20 }

/** For a string: an `aria-label`, a toast, plain inline text. */
export function useFormatMoney() {
  const t = useTranslations('common')
  const format = useFormatter()

  return function formatMoney(amountToman: number): string {
    return t.markup('money', {
      amount: format.number(amountToman, AMOUNT_FORMAT),
      unit: (chunks) => chunks,
    })
  }
}

type MoneyProps = {
  amountToman: number
  /** Styles the unit apart from the figure; the figure inherits from the parent. */
  unitClassName?: string
}

/** For markup: the same text, with the unit in its own element. */
export function Money({ amountToman, unitClassName }: MoneyProps) {
  const t = useTranslations('common')
  const format = useFormatter()

  return t.rich('money', {
    amount: format.number(amountToman, AMOUNT_FORMAT),
    unit: (chunks) => <span className={unitClassName}>{chunks}</span>,
  })
}
