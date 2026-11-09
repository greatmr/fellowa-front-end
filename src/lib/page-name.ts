/**
 * What a public surface calls a creator page (FQ-17, BE-USER-07): its public
 * name when the owner gave one, else `@alias`. `null` when the page has
 * neither, for the caller's own "unnamed" copy. Never the account's
 * `displayName`, which stays private (Q-63) and is not in any public response.
 */
export function publicPageTitle(page: {
  pageName: string | null
  alias: string | null
}): { name: string; initial: string; isAlias: boolean } | null {
  const pageName = page.pageName?.trim()
  if (pageName) {
    return { name: pageName, initial: firstLetter(pageName), isAlias: false }
  }
  const alias = page.alias?.trim()
  if (alias) {
    return { name: `@${alias}`, initial: firstLetter(alias), isAlias: true }
  }
  return null
}

/** The avatar fallback: the first character, whole even outside the BMP. */
function firstLetter(value: string): string {
  return (Array.from(value)[0] ?? '').toUpperCase()
}
