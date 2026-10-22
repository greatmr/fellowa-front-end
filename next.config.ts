import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

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
}

const withNextIntl = createNextIntlPlugin()

export default withNextIntl(nextConfig)
