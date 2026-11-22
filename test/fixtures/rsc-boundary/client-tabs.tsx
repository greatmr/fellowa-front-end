'use client'

// Fixture for test/rsc-boundary.test.ts; never rendered.
export const tabs = ['posts', 'about'] as const
export type Tab = (typeof tabs)[number]

export function Tabs() {
  return null
}
