import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';
import { ignores, sharedTsRules, testOverrides } from './base.js';

/** Config for apps/mobile. */
export default [
  ignores,
  { ignores: ['.expo/**', 'ios/**', 'android/**', 'expo-env.d.ts'] },
  ...expoConfig,
  { plugins: { '@typescript-eslint': tseslint.plugin } },
  { files: ['**/*.{ts,tsx}'], rules: sharedTsRules },
  testOverrides,
  prettier,
];
