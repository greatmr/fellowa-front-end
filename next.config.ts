import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

import { legacyAuthRedirects } from './src/features/auth/lib/legacy-routes'

const nextConfig: NextConfig = {
  cacheComponents: true,
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
