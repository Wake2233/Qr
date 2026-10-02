import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier';
import { ignores, sharedTsRules, testOverrides } from './base.js';

/** Config for apps/web. */
export default [
  ignores,
  { ignores: ['.next/**', 'next-env.d.ts'] },
  ...nextVitals,
  ...nextTs,
  { rules: sharedTsRules },
  {
    // Next.js route/config files require default exports; everything else uses named exports.
    files: ['src/components/**/*.{ts,tsx}', 'src/lib/**/*.{ts,tsx}'],
    rules: { 'import/no-default-export': 'error' },
  },
  testOverrides,
  prettier,
];
