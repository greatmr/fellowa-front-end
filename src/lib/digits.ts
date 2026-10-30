const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Persian or Arabic-Indic digits typed on a phone keyboard become Latin. */
export function toLatinDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (d) =>
    String(
      PERSIAN_DIGITS.includes(d)
        ? PERSIAN_DIGITS.indexOf(d)
        : ARABIC_DIGITS.indexOf(d)
    )
  )
}
