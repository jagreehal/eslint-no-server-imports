import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import noServerImports from 'eslint-plugin-no-server-imports';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files SvelteKit may bundle into the client. `+page.ts` / `+layout.ts` and
// anything under `$lib` (src/lib) run on both server and client, and `.svelte`
// components hydrate in the browser — so all of these are checked. (Extensions
// are mutually exclusive, so the `.ts` and `.svelte` patterns never cross-match.)
const clientFilePatterns = [
  '**/+page.ts',
  '**/+layout.ts',
  '**/src/lib/**',
  '**/*.svelte',
  '**/+page.svelte',
  '**/+layout.svelte',
];

// Server-only files, exempt from the rule. SvelteKit itself already refuses to
// bundle `*.server.*`, `+server.ts`, and `$lib/server` into client code (Vite
// throws at build), so the rule is a complementary, in-editor guard.
const serverFilePatterns = [
  '**/*.server.ts',
  '**/*.server.tsx',
  '**/*.server.js',
  '**/+server.ts',
  '**/+page.server.ts',
  '**/+layout.server.ts',
];

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    // The Svelte parser needs the TS parser to read `<script lang="ts">` blocks;
    // without this, `import type { ... }` inside a component is a syntax error.
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx,svelte}'],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      'no-server-imports': noServerImports,
    },
    rules: {
      'no-server-imports/no-server-imports': [
        'error',
        {
          // The rule bans genuinely Node-only *modules* (node:* built-ins, pino,
          // database drivers, …) from client code — not file-to-file imports.
          // Add project-specific server-only packages via `serverModules` here.
          clientFilePatterns,
          serverFilePatterns,
        },
      ],
    },
  },
  {
    ignores: ['build/**', '.svelte-kit/**'],
  }
);
