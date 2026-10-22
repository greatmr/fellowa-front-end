import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the `@/*` alias from tsconfig.json natively.
    tsconfigPaths: true,
  },
  test: {
    // Let Vite resolve next-intl's extensionless next/navigation import in
    // component tests, matching the application's bundler resolution.
    server: { deps: { inline: ['next-intl'] } },
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'test/**/*.{test,spec}.{ts,tsx}',
    ],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/components/ui/*.tsx'],
      exclude: ['**/*.{test,spec}.{ts,tsx}'],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
})
