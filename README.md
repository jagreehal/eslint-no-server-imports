# eslint-plugin-no-server-imports

Modern frameworks cram server and client files together. You flip between them fast, review a PR, feel confident…and then the bundle explodes because someone `import prisma from '@prisma/client'` in a component. Builds take minutes. CI nags later. Users see the error first. Meanwhile you're diffing stack traces wondering where your day went.

This plugin shortens the feedback loop to zero:

- **Write code → see error immediately** - ESLint surfaces violations as you type, not minutes later in a build
- **Stay in flow** - Fix happens in the same editor where you're working. No context switching, no waiting for bundlers
- **Builds become boring** - Errors are caught in dev mode, so `npm run build` confirms what you already know instead of surprising you
- **Productive dev loop** - Write, see feedback, fix, move on. The way it should be.

**What it catches:**

```ts
// ❌ This triggers an error in your editor:
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';

// ✅ This is safe:
import type { User } from '@prisma/client';
```

Done. The rule now blocks `fs`, `prisma`, `pino`, and 100+ other server-only modules from being imported in client code. Type-only imports (`import type`) are always safe. [Full docs →](#docs--further-reading)

```bash
pnpm add -D eslint-plugin-no-server-imports @typescript-eslint/utils
```

```ts
// eslint.config.mjs
import noServerImports from 'eslint-plugin-no-server-imports';
export default [noServerImports.configs['recommended-next']]; // or 'recommended-astro' / 'recommended-sveltekit'
```

Using plain JS? Drop the `files` filter. Already on a flat ESLint config? Just keep the `plugins` + `rules` block.

## Framework presets (smarter defaults)

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

Need your own aliases like `@/lib/db` or `@company/logger`? Add them via `serverModules`. Full list lives in [`packages/eslint-plugin-no-server-imports/README.md`](./packages/eslint-plugin-no-server-imports/README.md#server-only-modules).

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

## Configuration knobs you'll actually touch

```ts
{
  rules: {
    'no-server-imports/no-server-imports': ['error', {
      serverModules: ['@/lib/db', '@acme/logger'],
      serverFilePatterns: ['**/backend/**'],
      clientFilePatterns: ['**/app/**', '**/pages/**', '**/components/**'],
      ignoreFiles: ['**/__tests__/**', '**/*.stories.tsx'],
      checkServerOnlyMarker: true,
      checkServerFunctions: true,
      serverFunctionNames: ['createServerFn', 'server$', 'loader$', 'defineEventHandler'],
      reportUnusedImports: true,
      mode: 'client-only',          // switch to 'all-non-server' for stricter linting
      serverExternalPackages: ['better-sqlite3'], // mirrors next.config.js
    }],
  },
}
```

Some tips from lived-in projects:

- Next.js root-level `app/`: set `clientFilePatterns` to include `'**/app/**'`.
- Want every shared util checked? use `mode: 'all-non-server'`.
- Using `serverExternalPackages` in `next.config.js`? Pass the same array here so ESLint and Next agree.

## VS Code extension (optional)

Install `jagreehal.vscode-no-server-imports` and you get:

- Status bar indicator that shows which framework preset the extension detected
- Commands to re-run detection or jump to docs
- ESLint violations surfaced instantly alongside the official ESLint extension

```bash
code --install-extension jagreehal.vscode-no-server-imports
```

You still need the [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint); this plugin just gives it sharper context.

## Docs & further reading

- [Full rule documentation, option reference, and server-module list](./packages/eslint-plugin-no-server-imports/README.md)
- [VS Code extension walkthrough](./packages/vscode-no-server-imports/README.md)
- Example apps for Next.js, Astro, and SvelteKit live in `apps/*`

## Working in this repo

```bash
# install everything
pnpm install

# build the ESLint plugin (packages/eslint-plugin-no-server-imports)
pnpm build

# run unit tests + lint for the plugin
pnpm test
pnpm lint

# run the cross-framework regression script
pnpm test:rule
```

Need to see the rule in action, run ESLint on a specific example?

```bash
pnpm --filter nextjs-example lint
pnpm --filter astro-example lint
pnpm --filter sveltekit-example lint
```

Dev servers:

- `pnpm dev:nextjs`
- `pnpm dev:astro`
- `pnpm dev:sveltekit`

License: MIT.

Now go catch those imports before they catch you.
