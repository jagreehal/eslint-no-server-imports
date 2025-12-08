# Test Scripts

This directory contains scripts to test that the ESLint rule works correctly across all example apps.

## test-rule.ts (TypeScript)

The primary test script. Uses ESLint's JSON output format to parse results and verify expected behavior.

**Usage:**
```bash
pnpm test:rule
```

**What it does:**
1. Runs ESLint on each example app with `--format json`
2. Parses the JSON output to find errors for specific test files
3. Verifies that:
   - Bad example files **do** have `no-server-imports/no-server-imports` errors
   - Good example files **don't** have errors
   - Server files **don't** have errors
4. Reports a summary

**Requirements:**
- TypeScript and `tsx` (installed as dev dependencies)
- Plugin must be built (`pnpm build`)
- All app dependencies must be installed (`pnpm install`)

## test-rule.sh (Shell Script)

Alternative shell script version. Requires `jq` for JSON parsing.

**Usage:**
```bash
pnpm test:rule:sh
# or
./scripts/test-rule.sh
```

**Requirements:**
- `jq` installed (`brew install jq` on macOS)
- Plugin must be built
- All app dependencies must be installed

## Test Cases

The scripts test the following files:

### Next.js
- ✅ `src/app/bad-example.tsx` - Should error
- ✅ `src/app/good-example.tsx` - Should NOT error
- ✅ `src/app/api/route.ts` - Should NOT error (server route)

### Astro
- ✅ `src/pages/bad-example.astro` - Should error
- ✅ `src/pages/good-example.astro` - Should NOT error
- ✅ `src/pages/api/test.server.ts` - Should NOT error (server file)

### SvelteKit
- ✅ `src/routes/bad-example/+page.svelte` - Should error
- ✅ `src/routes/bad-page/+page.ts` - Should error
- ✅ `src/routes/good-example/+page.svelte` - Should NOT error
- ✅ `src/routes/api/test/+server.ts` - Should NOT error (server route)








