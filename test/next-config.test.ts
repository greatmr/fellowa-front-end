// @vitest-environment node
import { describe, expect, it } from 'vitest'

import nextConfig from '../next.config'
import {
  MAX_TIER_COVER_BYTES,
  SERVER_ACTION_BODY_LIMIT_BYTES,
} from '../src/features/tiers/lib/cover-limits'

describe('next.config body limits (FE-TIER-02, FE-TIER-04)', () => {
  it('lets the proxy clone as much of a body as a Server Action accepts', () => {
    const { experimental } = nextConfig
    expect(experimental?.serverActions?.bodySizeLimit).toBe(
      SERVER_ACTION_BODY_LIMIT_BYTES
    )
    // Next's default, 10 MB, would truncate a cover near the limit.
    expect(experimental?.proxyClientMaxBodySize).toBe(
      SERVER_ACTION_BODY_LIMIT_BYTES
    )
    expect(SERVER_ACTION_BODY_LIMIT_BYTES).toBeGreaterThan(MAX_TIER_COVER_BYTES)
  })
})
