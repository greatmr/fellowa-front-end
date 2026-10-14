import { createNavigation } from "next-intl/navigation";

import { routing } from "@/i18n/routing";

/**
 * Locale-aware navigation. Use these instead of `next/link` and
 * `next/navigation` everywhere in the app, or links will drop the locale
 * prefix.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
