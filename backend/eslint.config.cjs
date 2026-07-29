const globals = require('globals');

module.exports = [
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Catch clauses should not be empty
      'no-empty': ['error', { allowEmptyCatch: false }],
      // No unused variables (except underscore-prefixed)
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Prefer const for variables that don't change
      'prefer-const': 'error',
      // No var
      'no-var': 'error',
      // Consistent equality — === not ==
      eqeqeq: 'error',
      // No eval
      'no-eval': 'error',
      // No multi-spaces (except alignment in variable declarations)
      'no-multi-spaces': 'off',
      // Require error handling in async/await
      'no-async-promise-executor': 'error',
      // No unnecessary return statements
      'no-useless-return': 'error',
      // No template literals for simple strings
      'no-template-curly-in-string': 'error',
      // Enforce consistent curly brace style
      curly: ['error', 'multi-line'],
      // Prevent assignment in conditional expressions
      'no-cond-assign': 'error',
      // No debugger statements
      'no-debugger': 'error',
    },
  },
  {
    // Ignore patterns
    ignores: ['node_modules/', 'dist/', 'coverage/'],
  },
];
