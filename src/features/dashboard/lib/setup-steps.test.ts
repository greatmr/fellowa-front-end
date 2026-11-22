import { describe, expect, it } from 'vitest'

import {
  deriveSetupSteps,
  hasPublishedPost,
  publishBlockedBy,
} from '@/features/dashboard/lib/setup-steps'
import type {
  DashboardPost,
  SetupFacts,
} from '@/features/dashboard/types/dashboard'

const none: SetupFacts = {
  username: null,
  hasProfileImages: false,
  hasTier: false,
  hasPost: false,
  hasPayoutDetails: false,
  isPublished: false,
}

describe('deriveSetupSteps', () => {
  it('lists the five steps in the design order, all open for a new account', () => {
    expect(deriveSetupSteps(none)).toEqual([
      { id: 'profile', done: false },
      { id: 'firstTier', done: false },
      { id: 'firstPost', done: false },
      { id: 'payout', done: false },
      { id: 'publish', done: false },
    ])
  })

  it('marks each step from its own fact; a username alone is not step 1', () => {
    const steps = deriveSetupSteps({
      ...none,
      username: 'sara',
      hasTier: true,
      hasPayoutDetails: true,
    })

    expect(steps.map((s) => s.done)).toEqual([false, true, false, true, false])
  })

  it('does not tick the first-post step when the posts could not be read', () => {
    const steps = deriveSetupSteps({ ...none, hasPost: null })
    expect(steps.find((s) => s.id === 'firstPost')?.done).toBe(false)
  })
})

describe('hasPublishedPost', () => {
  const post = (publishedAt: string | null): DashboardPost => ({
    id: 1,
    title: 'x',
    body: null,
    excerpt: null,
    publishedAt,
    createdAt: '2026-11-20T08:00:00.000Z',
    audience: 'public',
  })

  it('counts a published post, not a draft', () => {
    expect(hasPublishedPost({ ok: true, posts: [] })).toBe(false)
    expect(hasPublishedPost({ ok: true, posts: [post(null)] })).toBe(false)
    expect(
      hasPublishedPost({
        ok: true,
        posts: [post(null), post('2026-11-20T08:00:00.000Z')],
      })
    ).toBe(true)
  })

  it('is unknown when the read failed', () => {
    expect(hasPublishedPost({ ok: false })).toBeNull()
  })
})

describe('publishBlockedBy (CP-05)', () => {
  it('asks for a username first, then a tier', () => {
    expect(publishBlockedBy(none)).toBe('username')
    expect(publishBlockedBy({ ...none, username: 'sara' })).toBe('firstTier')
  })

  it('does not block with a username and a tier', () => {
    expect(
      publishBlockedBy({ ...none, username: 'sara', hasTier: true })
    ).toBeNull()
  })
})
