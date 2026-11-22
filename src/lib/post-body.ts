/**
 * A post body as the API wrote it (Q-83, BE-CONT-14): `plain` text, or `html`
 * that the server sanitised before storing it. Only `postBodyFromApi`, called
 * while parsing an API response, makes the `html` variant, so `RichBody` can
 * never be handed markup built in the browser (local state, the editor, a
 * converted plain post): the type does not let it through.
 */

declare const serverHtml: unique symbol

/** HTML exactly as an API response carried it; never built on the client. */
export type ServerHtml = string & { readonly [serverHtml]: true }

export type BodyFormat = 'plain' | 'html'

export type PostBody =
  { format: 'plain'; text: string } | { format: 'html'; html: ServerHtml }

/**
 * The body of a parsed response, or `null` when there is none. Call only on
 * a string just read from the API, with the `bodyFormat` it came with.
 */
export function postBodyFromApi(
  text: string | null | undefined,
  format: BodyFormat
): PostBody | null {
  if (!text) return null
  // The one place the brand is given: the string is the server's own.
  return format === 'html'
    ? { format: 'html', html: text as ServerHtml }
    : { format: 'plain', text }
}
