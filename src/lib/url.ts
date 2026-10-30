/**
 * An absolute http(s) URL from untrusted API data, or `null`. Anything else
 * (a bare object key, `javascript:`, a relative path) is dropped, so it can
 * never reach an `href`, a `src` or a CSS `url()`.
 */
export function httpUrlOrNull(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.href
      : null
  } catch {
    return null
  }
}
