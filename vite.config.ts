import { defineConfig } from 'vite-plus';

export default defineConfig({
  fmt: {
    printWidth: 100,
    singleQuote: true,
    ignorePatterns: [
      '.changeset/**',
      'docs/.next/**',
      'docs/.source/**',
      'docs/out/**',
      'docs/next-env.d.ts',
      'example/andorid/**',
      'example/ios/**',
      'rolldown/**',
      '**/e2e/__fixtures__/**',
      '**/.**',
    ],
    experimentalSortImports: {
      groups: [
        ['type-import'],
        ['type-builtin', 'value-builtin'],
        ['type-external', 'value-external', 'type-internal', 'value-internal'],
        [
          'type-parent',
          'type-sibling',
          'type-index',
          'value-parent',
          'value-sibling',
          'value-index',
        ],
        ['unknown'],
      ],
    },
  },
  lint: {
    ignorePatterns: ['rolldown/**', 'docs/**', 'example/**', '**/e2e/__fixtures__/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
