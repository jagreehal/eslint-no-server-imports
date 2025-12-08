# eslint-plugin-no-server-imports

Modern frameworks cram server and client files together. You flip between them fast, review a PR, feel confident…and then the bundle explodes because someone `import prisma from '@prisma/client'` in a component. Builds take minutes. CI nags later. Users see the error first. Meanwhile you're diffing stack traces wondering where your day went.

This plugin shortens the feedback loop to zero:

- **Write code → see error immediately** - ESLint surfaces violations as you type, not minutes later in a build
- **Stay in flow** - Fix happens in the same editor where you're working. No context switching, no waiting for bundlers
- **Builds become boring** - Errors are caught in dev mode, so `npm run build` confirms what you already know instead of surprising you
- **Productive dev loop** - Write, see feedback, fix, move on. The way it should be.

## TL;DR

```bash
pnpm add -D eslint-plugin-no-server-imports @typescript-eslint/utils
```

```ts
// eslint.config.mjs
import noServerImports from 'eslint-plugin-no-server-imports';
export default [noServerImports.configs['recommended-next']]; // or 'recommended-astro' / 'recommended-sveltekit'
```

**What it catches:**

```ts
// ❌ This triggers an error in your editor:
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

// ✅ This is safe:
import type { User } from '@prisma/client';
```

Done. Blocks `fs`, `prisma`, `pino`, and 100+ server-only modules in client code. Type-only imports are always safe. [Full config options →](#configuration)

## Quick start

```bash
pnpm add -D eslint-plugin-no-server-imports @typescript-eslint/utils
# npm/yarn/bun work too - ESLint 9+ is the only peer dependency.
```

```ts
// eslint.config.mjs
import tseslint from 'typescript-eslint';
import noServerImports from 'eslint-plugin-no-server-imports';

export default [
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { 'no-server-imports': noServerImports },
    rules: {
      'no-server-imports/no-server-imports': 'error',
    },
  },
];
```

Using plain JS? Drop the `files` filter. Already on a flat ESLint config? Just keep the `plugins` + `rules` block.

### Framework presets (smarter defaults)

```ts
import noServerImports from 'eslint-plugin-no-server-imports';

export default [
  noServerImports.configs['recommended-next'],
  // or: noServerImports.configs['recommended-astro']
  // or: noServerImports.configs['recommended-sveltekit']
];
```

Each preset ships with tuned `clientFilePatterns` + `serverFilePatterns` for that framework. If you keep `app/` at the repo root in Next.js, add `'**/app/**'` yourself - the default intentionally sticks to `src/app/**` so it doesn't match `myapp/src/...` by accident.

## What actually gets flagged

### Server-only modules (100+ built-ins and packages)

Out of the box the rule blocks:

- **Node built-ins**: `fs`, `node:fs`, `path`, `crypto`, `child_process`, `worker_threads`, …
- **Databases**: `prisma`, `@prisma/client`, `drizzle-orm`, `pg`, `mysql2`, `mongodb`, `kysely`, …
- **Logging & monitoring**: `pino`, `winston`, `bunyan`, `@appsignal/nodejs`, `dd-trace`, …
- **Security**: `bcrypt`, `argon2`, `oslo`, `@node-rs/*`
- **Tooling**: `@swc/core`, `postcss`, `typescript`, `jest`, `playwright`, `sharp`, …

Need your own aliases like `@/lib/db` or `@company/logger`? Add them via `serverModules`. Full list lives in [the complete server-only modules list](#server-only-modules).

### File awareness (so only the right files are checked)

- **Client patterns (default)**: `**/routes/**`, `**/pages/**`, `**/components/**`, `**/islands/**`, `**/src/app/**`
- **Server patterns (always skipped)**: `**/*.server.ts`, `**/*.server.tsx`, `**/*.server.js`, `**/server/**`, `**/api/**`, `**/_server/**`

By default the rule runs in `client-only` mode, meaning "only check paths that look like client code." Flip `mode: 'all-non-server'` if you want every non-server file scanned. `ignoreFiles` beats both modes when you need to silence generated code or test fixtures.

### Imports, re-exports, requires… all of it

- Static `import` and `export { ... } from` usage of server modules ✅
- Side-effect imports like `import 'fs'` ✅
- CommonJS `require('pg')` ✅ (the rule even tracks destructuring)
- Re-exports (`export * from 'pino'`) ✅
- Dynamic imports (`await import('pg')`) stay untouched because they're runtime-only.

The rule also understands server function scopes. If every reference to a value import stays inside a callback passed to functions like `createServerFn`, `createIsomorphicFn`, `server$`, `action$`, or `loader$`, it's considered safe. Configure `serverFunctionNames` to teach it your own helpers (Nuxt's `defineEventHandler`, Remix loaders, etc.). Next.js Server Actions aren't special-cased - keep the imports inside the `'use server'` function via `await import(...)` and you're good.

### What remains allowed

| Pattern | Why it passes |
| --- | --- |
| `import type { Logger } from 'pino'` | Type-only imports vanish during compilation. |
| `export { type Logger } from 'pino'` | Same deal - types don't hit bundles. |
| `import 'server-only';` | The "server-only" marker opts the whole file out (configurable via `checkServerOnlyMarker`). |
| Server function scopes | Imports pulled into callbacks from `createServerFn`/`server$`/`action$` stay server-side. |
| Dynamic imports inside functions | `const { PrismaClient } = await import('@prisma/client');` runs only when the server code executes. |

Quick fixes currently offer to insert `import 'server-only';` above your code when that's the right escape hatch. Prefer to keep unused imports warnings in one place? Set `reportUnusedImports: false` and let `no-unused-vars` handle it.

## Configuration

All options are optional and can be fully customized. Here's a complete example with all options:

```ts
{
  rules: {
    'no-server-imports/no-server-imports': ['error', {
      // Add custom server-only modules (merged with 100+ defaults)
      serverModules: ['@/lib/logger', 'my-custom-db'],

      // File patterns for server files (merged with defaults)
      serverFilePatterns: ['**/backend/**', '**/server-utils/**'],

      // File patterns for client files (replaces defaults if provided)
      clientFilePatterns: ['**/app/**', '**/pages/**', '**/components/**'],

      // Files to completely ignore
      ignoreFiles: ['**/__tests__/**', '**/*.stories.tsx', '**/generated/**'],

      // Detection behavior
      checkServerOnlyMarker: true,  // Respect 'server-only' import marker
      checkServerFunctions: true,   // Allow imports inside server function callbacks
      serverFunctionNames: ['createServerFn', 'server$', 'action$', 'loader$', 'myServerFn'],

      // Reporting behavior
      reportUnusedImports: true,    // Report unused server imports (default: true)

      // File selection strategy
      mode: 'client-only',           // or 'all-non-server' to check all non-server files

      // Next.js integration
      serverExternalPackages: ['my-native-package'], // Sync with next.config.js
    }],
  },
}
```

### Minimal configuration

For most projects, the defaults work out of the box. You only need to configure options that differ from defaults:

```ts
{
  rules: {
    'no-server-imports/no-server-imports': ['error', {
      // Only configure what you need to change
      clientFilePatterns: ['**/app/**', '**/pages/**'], // Next.js root app/
      serverModules: ['@/lib/db'],                      // Your custom modules
    }],
  },
}
```

### Option reference

#### `serverModules` (optional)

- **Type**: `string[]`
- **Default**: 100+ built-in server-only modules (see list below)
- **What it does**: Adds additional server-only modules to the detection list. These modules will trigger errors when imported in client code.
- **Why it exists**: Your project might use custom server-only packages, internal modules with path aliases (like `@/lib/db`), or packages not in the default list. This option lets you extend the detection to cover your specific stack.
- **Example**: `serverModules: ['@/lib/logger', 'my-custom-db', '../server/utils']`
- **Note**: Supports path aliases, relative paths, and subpath imports (e.g., `'@/lib/db'` will also match `'@/lib/db/query'`)

#### `serverFilePatterns` (optional)

- **Type**: `string[]`
- **Default**: `['**/*.server.ts', '**/*.server.tsx', '**/*.server.js', '**/server/**', '**/api/**', '**/_server/**']`
  - `**/*.server.*` - Files with `.server.` in the name (Astro convention)
  - `**/server/**` - Files in `server/` directories
  - `**/api/**` - API route directories (Next.js, SvelteKit, etc.)
  - `**/_server/**` - Alternative server directory pattern
- **What it does**: Defines file path patterns that indicate server-only code. Files matching these patterns are completely ignored by the rule.
- **Why it exists**: Server files can safely import server-only modules, so we skip checking them entirely. This improves performance and prevents false positives.
- **Example**: `serverFilePatterns: ['**/backend/**', '**/server/**', '**/*.server.ts']`
- **Note**: Patterns are **merged** with defaults (not replaced). Use glob patterns compatible with `picomatch`.

#### `clientFilePatterns` (optional)

- **Type**: `string[]`
- **Default**: `['**/routes/**', '**/pages/**', '**/components/**', '**/islands/**', '**/src/app/**']`
  - `**/routes/**` - Route files (SvelteKit, Remix)
  - `**/pages/**` - Page files (Next.js pages router, Nuxt, Astro)
  - `**/components/**` - Component files (generic)
  - `**/islands/**` - Island components (Astro)
  - `**/src/app/**` - Next.js app directory (when using `src/` folder)
- **What it does**: Defines file path patterns that indicate client code. Only files matching these patterns are checked for server-only imports (when `mode: 'client-only'`).
- **Why it exists**: Different frameworks organize client code differently. This lets you configure the rule to match your project structure.
- **Example**: `clientFilePatterns: ['**/app/**', '**/pages/**', '**/components/**']` for Next.js root-level `app/`
- **Note**: If provided, this **replaces** the defaults (doesn't merge). Include all patterns you need. For Next.js root-level `app/`, you must explicitly add `'**/app/**'` because the default only covers `'**/src/app/**'` to avoid false matches.

#### `ignoreFiles` (optional)

- **Type**: `string[]`
- **Default**: `[]`
- **What it does**: File patterns to completely ignore, regardless of whether they match client or server patterns.
- **Why it exists**: Some files like tests, stories, or generated code might need to import server modules for testing/mocking purposes. This provides a clean way to exclude them.
- **Example**: `ignoreFiles: ['**/__tests__/**', '**/*.test.ts', '**/*.stories.tsx', '**/generated/**']`
- **Note**: This takes precedence over both `clientFilePatterns` and `serverFilePatterns`.

#### `checkServerOnlyMarker` (optional)

- **Type**: `boolean`
- **Default**: `true`
- **What it does**: When enabled, if a file contains `import 'server-only'` or `require('server-only')`, the entire file is treated as server-only and all imports are allowed.
- **Why it exists**: The `server-only` package is a common runtime guard. This option respects that marker as an explicit opt-in to server-only behavior, providing an escape hatch for edge cases.
- **Example**: Set to `false` if you want stricter checking even with the marker, or if you don't use `server-only` at all.

#### `checkServerFunctions` (optional)

- **Type**: `boolean`
- **Default**: `true`
- **What it does**: When enabled, the rule detects server function calls (like `createServerFn()`, `server$()`, etc.) and allows server-only imports if they're **only** used inside the server function callbacks.
- **Why it exists**: Modern frameworks use server functions/actions that run server-side. Imports used exclusively inside these callbacks are safe because they never execute on the client. This enables the recommended pattern of importing server modules inside server functions.
- **Example**: Set to `false` if you want to disallow all server imports in client files, even inside server functions (stricter mode).

#### `serverFunctionNames` (optional)

- **Type**: `string[]`
- **Default**: `['createServerFn', 'createIsomorphicFn', 'server$', 'action$', 'loader$']`
  - `createServerFn` - TanStack Start
  - `createIsomorphicFn` - TanStack Start (isomorphic functions)
  - `server$` - SolidStart
  - `action$` - Remix
  - `loader$` - Remix
- **What it does**: Function names that create server-side execution contexts. The rule tracks callbacks passed to these functions and allows server-only imports used exclusively within those callbacks.
- **Why it exists**: Different frameworks use different function names for server actions. This lets you configure the rule to recognize your framework's patterns (e.g., Nuxt's `defineEventHandler`, Remix's `action$`/`loader$`).
- **Example**: `serverFunctionNames: ['createServerFn', 'server$', 'defineEventHandler', 'myCustomServerFn']`
- **Note**: The rule detects both direct calls (`createServerFn()`) and chained calls (`createServerFn().handler()`). It tracks where imports are **used**, not just where they're declared. If you provide this option, it **replaces** the defaults (doesn't merge), so include all function names you need.

#### `reportUnusedImports` (optional)

- **Type**: `boolean`
- **Default**: `true`
- **What it does**: When `true`, reports server-only imports even if they're never used in the file. When `false`, only reports imports that are actually referenced.
- **Why it exists**: Some teams prefer to let ESLint's `no-unused-vars` rule handle unused imports. Setting this to `false` avoids duplicate warnings and lets you use `no-unused-vars` for all unused imports consistently.
- **Example**: Set to `false` if you want `no-unused-vars` to handle unused imports, or `true` if you want this rule to catch unused server imports specifically.

#### `mode` (optional)

- **Type**: `'client-only' | 'all-non-server'`
- **Default**: `'client-only'`
- **What it does**: Controls which files are checked:
  - `'client-only'`: Only files matching `clientFilePatterns` are checked
  - `'all-non-server'`: All files are checked except those matching `serverFilePatterns` or `ignoreFiles`
- **Why it exists**: Some projects have files that aren't explicitly client code but also shouldn't import server modules (e.g., shared utilities, config files). `'all-non-server'` mode catches server imports in these ambiguous files.
- **Example**: Use `'all-non-server'` if you want comprehensive checking across your entire codebase, not just known client files.

#### `serverExternalPackages` (optional)

- **Type**: `string[]`
- **Default**: `[]`
- **What it does**: Merges Next.js `serverExternalPackages` configuration into `serverModules`. Packages listed here are treated as server-only.
- **Why it exists**: Next.js has a `serverExternalPackages` config option that marks packages that shouldn't be bundled for the client. This option lets you sync that configuration with the ESLint rule, ensuring consistency between your Next.js config and linting.
- **Example**: `serverExternalPackages: ['my-native-package', '@my-org/server-lib']` (typically read from `next.config.js`)
- **Note**: This is merged with `serverModules`, so you can use both options together. Primarily useful for Next.js projects.

### Common tweaks

- **Next.js root `app/`**: `clientFilePatterns: ['**/app/**', '**/pages/**', '**/components/**']`
- **Next.js with serverExternalPackages**: Use `serverExternalPackages` option to sync with your `next.config.js`
- **Check all files**: `mode: 'all-non-server'` - checks every file except server patterns
- **Let `no-unused-vars` handle unused imports**: `reportUnusedImports: false`
- **Astro**: `clientFilePatterns: ['**/pages/**', '**/components/**', '**/islands/**']`, `serverFilePatterns: ['**/*.server.ts', '**/server/**']`
- **SvelteKit**: Check out the monorepo examples - we've got working configs for all three frameworks.
- **Custom infra**: add in-house modules to `serverModules` (supports aliases like `@/lib/db` and subpaths).

### Next.js integration

If you're using Next.js's `serverExternalPackages` in `next.config.js`, you can sync it with this rule:

```ts
// eslint.config.mjs
import nextConfig from './next.config.js';

export default [
  {
    rules: {
      'no-server-imports/no-server-imports': ['error', {
        serverExternalPackages: nextConfig.serverExternalPackages || [],
        clientFilePatterns: ['**/app/**', '**/pages/**', '**/components/**'],
      }],
    },
  },
];
```

## Server-only modules

Complete list of server-only modules detected by default:

- **Logging**: `pino`, `pino-pretty`, `pino-roll`, `winston`, `bunyan`
- **Databases**: `better-sqlite3`, `pg`, `mysql2`, `mongodb`, `mongoose`, `prisma`, `@prisma/client`, `drizzle-orm`, `kysely`, `@libsql/client`, `libsql`, `@mikro-orm/core`, `@mikro-orm/knex`, `sqlite3`, `ravendb`
- **Node.js built-ins**: `fs`, `node:fs`, `fs/promises`, `node:fs/promises`, `path`, `node:path`, `crypto`, `node:crypto`, `child_process`, `node:child_process`, `os`, `node:os`, `net`, `node:net`, `dns`, `node:dns`, `cluster`, `node:cluster`, `worker_threads`, `node:worker_threads`
- **Authentication & Security**: `argon2`, `@node-rs/argon2`, `bcrypt`, `@node-rs/bcrypt`, `oslo`
- **AWS SDK**: `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `aws-crt`
- **Monitoring & Observability**: `@appsignal/nodejs`, `@highlight-run/node`, `@sentry/profiling-node`, `dd-trace`, `newrelic`, `@statsig/statsig-node-core`
- **AI & ML**: `@huggingface/transformers`, `@xenova/transformers`, `chromadb-default-embed`, `onnxruntime-node`
- **Blockchain**: `@blockfrost/blockfrost-js`, `@jpg-store/lucid-cardano`
- **Build Tools & Compilers**: `@swc/core`, `autoprefixer`, `postcss`, `prettier`, `typescript`, `ts-node`, `ts-morph`, `webpack`, `eslint`
- **Testing**: `cypress`, `jest`, `playwright`, `playwright-core`, `puppeteer`, `puppeteer-core`
- **Browser Automation**: `@sparticuz/chromium`, `@sparticuz/chromium-min`
- **Content & Document Generation**: `@react-pdf/renderer`, `mdx-bundler`, `next-mdx-remote`, `next-seo`, `shiki`, `vscode-oniguruma`
- **Image Processing**: `canvas`, `sharp`
- **Utilities**: `config`, `keyv`, `node-cron`, `rimraf`, `thread-stream`
- **Runtime & Framework**: `@alinea/generated`, `@zenstackhq/runtime`, `express`, `firebase-admin`, `htmlrewriter`
- **Native Node.js addons**: `cpu-features`, `isolated-vm`, `node-pty`, `node-web-audio-api`, `websocket`, `zeromq`
- **Module System Patchers**: `import-in-the-middle`, `require-in-the-middle`
- **DOM & Browser APIs**: `jsdom`

The rule also detects subpath imports (e.g., `fs/promises` matches `fs`, `@prisma/client/query` matches `@prisma/client`).

## Behavioral summary

Quick reference for what triggers what:

| Import style | Bundled? | Rule result |
| --- | --- | --- |
| `import pino from 'pino'` | Yes | ❌ error|
| `const fs = require('fs')` | Yes | ❌ error |
| `export { default } from 'pino'` | Yes | ❌ error |
| `import type { Logger } from 'pino'` | No | ✅ allowed |
| `import { type Logger } from 'pino'` | No | ✅ allowed |
| `export { type Logger } from 'pino'` | No | ✅ allowed |
| `await import('pino')` inside function | Lazy | ✅ allowed |

## Quick fix suggestions

When the rule detects a violation, it can offer to insert `import 'server-only';` at the top of the file. That keeps the current file marked as server-only without touching any other logic. If you'd rather restructure things (move the code, switch to a server action, or wrap it in an `await import(...)`), decline the suggestion and do it manually - ESLint simply points to the exact import and lets you pick the right pattern.

> **Note**: Suggestions rely on ESLint's `hasSuggestions` API, so they're opt-in. Nothing changes until you accept the fix.

## VS Code extension

For an enhanced experience, install the companion VS Code extension:

```bash
code --install-extension jagreehal.vscode-no-server-imports
```

The extension provides:

- **Status bar indicator** - Shows detected framework (Next.js, Astro, SvelteKit) with icon
- **Show Status command** - Displays framework info and quick links to config/docs
- **Detect Framework command** - Re-scans the workspace for framework detection
- **Open Documentation command** - Opens framework-specific documentation

The extension works alongside the [ESLint VS Code extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint), which handles the actual linting.

## FAQ

**Does this replace the `server-only` runtime guard?**

No - keep it for defense in depth. This rule stops mistakes earlier; the runtime guard still protects you if someone bypasses linting. Think of it like wearing both a seatbelt and having airbags.

**Will it slow down ESLint?**

Nope. The rule only inspects files whose path matches the client patterns, and the AST work is limited to imports/exports/server-function calls. Expect negligible overhead compared to `typescript-eslint` itself. We're pretty efficient about this.

**How do I allow a specific file?**

Use `ignoreFiles` with any glob, or drop a `/* eslint-disable no-server-imports/no-server-imports */` pragma if you absolutely must. But really, try to fix the underlying issue first - that's usually the better path.

**What if my framework isn't supported?**

We've got defaults for Next.js, Astro, SvelteKit, TanStack Start, Remix, and SolidStart. If your framework uses different patterns, just configure `clientFilePatterns` and `serverFilePatterns` to match your setup. It's pretty flexible.

## Contributing & support

Issues and feature requests live at [GitHub Issues](https://github.com/jagreehal/eslint-plugin-no-server-imports/issues). Feel free to open a PR if your framework uses a different server function name - we're happy to add sensible defaults.

Want to see it in action? Check out the [monorepo examples](../../README.md) with working Next.js, Astro, and SvelteKit setups.

---

Stop finding server imports during deploys. Catch them in the editor instead.
