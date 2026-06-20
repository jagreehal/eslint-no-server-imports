import { defineConfig } from 'tsdown';

// Migrated from tsup, ESM-only (matches the rest of the toolchain; targets
// ESLint 9+/10 which loads ESM plugins). Notes:
// - tsdown auto-externalises dependencies + peerDependencies (picomatch,
//   @typescript-eslint/utils, eslint), so no manual `external` list is needed.
// - No "type": "module" on the package, so ESM output is emitted as .mjs / .d.mts;
//   package.json `exports` points at those.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
