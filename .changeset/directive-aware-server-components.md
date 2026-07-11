---
"eslint-plugin-no-server-imports": minor
---

Add `directiveAware` and `serverComponentPatterns` options for the Next.js App Router.

When `directiveAware: true`, the `'use client'` directive — not the file path —
decides whether a file is client code. A file that declares `'use client'` is
always checked (even outside `clientFilePatterns`), while a file matching
`serverComponentPatterns` (default: `clientFilePatterns`) that omits the
directive is treated as a React Server Component and skipped, so it may
legitimately import server-only modules. This removes the false positives you
would otherwise get when client and server components share the same directories
(e.g. `app/`, `components/`).
