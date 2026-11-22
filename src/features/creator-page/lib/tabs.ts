/**
 * The creator page's tabs. Plain values, kept out of the `'use client'`
 * `creator-tabs.tsx`: the server page and `CreatorPageView` read them during
 * the server render, where a client module's exports are references, not
 * values (`test/rsc-boundary.test.ts`).
 */
export const creatorPageTabs = [
  'posts',
  'collections',
  'tiers',
  'about',
] as const
export type CreatorPageTab = (typeof creatorPageTabs)[number]

/** The element the tab strip sits in, scrolled to when a tab is opened. */
export const CREATOR_TABS_ID = 'creator-page-tabs'

/** `?tab=` from the URL as one of the tabs; anything else opens Posts. */
export function creatorPageTab(value: unknown): CreatorPageTab {
  return creatorPageTabs.find((tab) => tab === value) ?? 'posts'
}
