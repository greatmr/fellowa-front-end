import { createNavigation } from 'next-intl/navigation'

import { routing } from '@/i18n/routing'

/**
 * Locale-aware navigation. Use these instead of `next/link` and
 * `next/navigation` everywhere in the app. URLs carry no locale (FE-I18N-01);
 * `getPathname({ …, forcePrefix: true })` is the one way to address a locale,
 * which the proxy turns into the locale cookie.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
