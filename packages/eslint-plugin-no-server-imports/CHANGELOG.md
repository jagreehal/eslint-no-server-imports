# eslint-plugin-no-server-imports

## 1.2.0

### Minor Changes

- [#77](https://github.com/jagreehal/eslint-no-server-imports/pull/77) [`6f47897`](https://github.com/jagreehal/eslint-no-server-imports/commit/6f47897ef0072626dfd4c4736173324d6b7077b6) Thanks [@jagreehal](https://github.com/jagreehal)! - Add `directiveAware` and `serverComponentPatterns` options for the Next.js App Router.

  When `directiveAware: true`, the `'use client'` directive — not the file path —
  decides whether a file is client code. A file that declares `'use client'` is
  always checked (even outside `clientFilePatterns`), while a file matching
  `serverComponentPatterns` (default: `clientFilePatterns`) that omits the
  directive is treated as a React Server Component and skipped, so it may
  legitimately import server-only modules. This removes the false positives you
  would otherwise get when client and server components share the same directories
  (e.g. `app/`, `components/`).

## 1.1.1

### Patch Changes

- [#39](https://github.com/jagreehal/eslint-no-server-imports/pull/39) [`68acf7a`](https://github.com/jagreehal/eslint-no-server-imports/commit/68acf7a4f90f902b02c89ff2976dc7c5afa923d9) Thanks [@jagreehal](https://github.com/jagreehal)! - Migrate the build from tsup to tsdown. The package now ships ESM-only (`dist/index.mjs` with `dist/index.d.mts` types); the CommonJS `require` entry has been removed.

## 1.1.0

### Minor Changes

- [#24](https://github.com/jagreehal/eslint-no-server-imports/pull/24) [`bda628b`](https://github.com/jagreehal/eslint-no-server-imports/commit/bda628bed0664e393ea792c2c4eb30051fc9b7f3) Thanks [@jagreehal](https://github.com/jagreehal)! - Add TanStack Start framework support with auto-detection, default client/server file patterns, and a `recommended-tanstack-start` config preset. Also widen ESLint peer dependency to `^9.0.0 || ^10.0.0` and replace deprecated `context.getFilename()`/`context.getSourceCode()` calls.
