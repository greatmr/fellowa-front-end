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

/** A tag, with quoted attribute values that may hold `>`. */
const TAG = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g
/** A comment, removed before tags so its contents never become text. */
const COMMENT = /<!--[\s\S]*?(?:-->|$)/g
const ENTITY = /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  zwnj: '‌',
  zwj: '‍',
}

function decodeEntity(
  entity: string,
  decimal: string | undefined,
  hex: string | undefined,
  name: string | undefined
): string {
  const code =
    decimal !== undefined
      ? Number.parseInt(decimal, 10)
      : hex !== undefined
        ? Number.parseInt(hex, 16)
        : null
  if (code === null) {
    return name === undefined
      ? entity
      : (NAMED_ENTITIES[name.toLowerCase()] ?? entity)
  }
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : entity
}

/**
 * An html body's text, for matching and estimating only; never rendered and
 * never parsed into a document. Comments and tags (attribute values with
 * them) become spaces, the common entities are decoded after the tags are
 * gone, and whitespace runs collapse to one space.
 */
export function htmlToSearchText(html: string): string {
  return html
    .replace(COMMENT, ' ')
    .replace(TAG, ' ')
    .replace(ENTITY, decodeEntity)
    .replace(/\s+/g, ' ')
    .trim()
}
