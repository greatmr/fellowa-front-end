import 'server-only'

import { headers } from 'next/headers'

import { env } from '@/lib/env'

/** Additional Origin check for auth mutations, including direct action calls. */
export async function validAuthRequestOrigin(): Promise<boolean> {
  const origin = (await headers()).get('origin')
  if (!origin || !env.NEXT_PUBLIC_APP_URL) return false
  try {
    const requestOrigin = new URL(origin)
    const appOrigin = new URL(env.NEXT_PUBLIC_APP_URL)
    return (
      (appOrigin.protocol === 'https:' || appOrigin.protocol === 'http:') &&
      requestOrigin.origin === origin &&
      requestOrigin.origin === appOrigin.origin
    )
  } catch {
    return false
  }
}
