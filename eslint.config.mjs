import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import pluginQuery from '@tanstack/eslint-plugin-query'
import prettier from 'eslint-config-prettier/flat'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...pluginQuery.configs['flat/recommended'],
  {
    rules: {
      // `any` hides contract mistakes, which is exactly what this app must not
      // do with backend data. Use `unknown` and narrow.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Only warn/error logging survives review.
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // shadcn/ui primitives are vendored from the registry: keep them as the
    // registry generates them so `shadcn add` can update them cleanly.
    files: ['src/components/ui/**'],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
  globalIgnores([
    '.claude/**',
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
  // Formatting belongs to Prettier; React, Next, TypeScript and Query rules
  // remain responsible for code quality.
  prettier,
])

export default eslintConfig
