import js from '@eslint/js';
import ts from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: ts.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node, ...globals.es2021 },
    },
  },
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.es2021 },
    },
  },
  {
    files: ['**/*.{test,spec}.{ts,js,mjs}', 'test/**/*.{ts,js,mjs}'],
    languageOptions: { globals: { ...globals.jest, ...globals.node } },
  },
  prettier,
);
