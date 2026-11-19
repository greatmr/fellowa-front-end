import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

import { legacyAuthRedirects } from './src/features/auth/lib/legacy-routes'
import { SERVER_ACTION_BODY_LIMIT_BYTES } from './src/features/tiers/lib/cover-limits'

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    serverActions: {
      // FE-TIER-02: tier covers reach `POST /tire/cover` through a Server
      // Action; the back-end accepts 10 MB (default 1 MB). Applies to every
      // action, each of which validates its own input.
      bodySizeLimit: SERVER_ACTION_BODY_LIMIT_BYTES,
    },
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // Remote images are served from Arvan Cloud / S3 by the backend. Add the
  // real bucket host here before rendering any <Image> from it; do not add a
  // wildcard.
  images: {
    remotePatterns: [],
  },
  async redirects() {
    return legacyAuthRedirects()
  },
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(nextConfig)
