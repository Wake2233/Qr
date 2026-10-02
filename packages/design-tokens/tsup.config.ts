import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/nativewind.ts'],
  format: ['esm', 'cjs'],
  // tsup's dts worker injects `baseUrl`, which TS 6 flags as deprecated.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  clean: true,
  target: 'es2022',
});
