// ESLint config for SEO OS frontend
// Note: @typescript-eslint doesn't support TS 7.x yet (as of July 2025).
// We use a hybrid approach: ESLint checks .js/.jsx config files only,
// and TypeScript's own compiler (tsc) handles type-checking and linting
// for .ts/.tsx files. Prettier handles formatting for all files.
//
// When typescript-eslint adds TS 7 support, we can re-enable the
// TypeScript-specific rules here.

module.exports = [
  {
    ignores: ['dist/', 'node_modules/', 'src/**/*.ts', 'src/**/*.tsx'],
  },
  {
    files: ['*.js', '*.cjs', '*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        node: 'readonly',
      },
    },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
      curly: ['error', 'multi-line'],
      'no-debugger': 'error',
    },
  },
];
