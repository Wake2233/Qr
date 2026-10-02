// Shared rules for every workspace. Platform configs (next.js / expo.js) layer on top.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/** Rules shared by all TypeScript workspaces. */
export const sharedTsRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/ban-ts-comment': [
    'error',
    { 'ts-expect-error': 'allow-with-description', 'ts-ignore': true },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: 'TSEnumDeclaration', message: 'Use `as const` objects instead of TS enums.' },
  ],
};

/** Relax rules that are noisy in test files. */
export const testOverrides = {
  files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
  rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
};

export const ignores = {
  ignores: ['**/dist/**', '**/coverage/**', '**/.turbo/**', '**/node_modules/**'],
};

/** Config for platform-agnostic packages (packages/*). */
export default tseslint.config(
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: sharedTsRules },
  testOverrides,
  prettier,
);
