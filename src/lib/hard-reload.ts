/**
 * A full document load that replaces the current history entry. Use it when
 * the client router's cache must not be reused and the page is the same
 * address — e.g. switching language, where every URL stays the same but its
 * content changes (FE-I18N-01). Back then leaves the page instead of
 * returning to the same address in the other language.
 */
export function hardReload(url: string) {
  window.location.replace(url)
}
