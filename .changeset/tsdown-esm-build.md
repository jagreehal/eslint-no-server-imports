---
"eslint-plugin-no-server-imports": patch
---

Migrate the build from tsup to tsdown. The package now ships ESM-only (`dist/index.mjs` with `dist/index.d.mts` types); the CommonJS `require` entry has been removed.
