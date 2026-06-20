import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';
import noServerImports from 'eslint-plugin-no-server-imports';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  {
    files: ['**/*.{ts,tsx,astro}'],
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
          // Note on Astro's model: component frontmatter (the `---` block) runs
          // on the server, so importing Node-only modules there is technically
          // safe. The rule still guards pages/components/islands because that
          // code is the path most likely to ship to the browser — a hydrated
          // island or a client `<script>` reaching for `fs` or `pino` is the
          // leak this catches. Move genuinely server-only work into endpoints
          // (api/, *.server.ts) so it stays exempt.
          clientFilePatterns: ['**/pages/**', '**/components/**', '**/islands/**'],

          // Files that are genuinely server-only and so exempt from the rule.
          serverFilePatterns: ['**/*.server.ts', '**/server/**'],

          // The rule bans genuinely Node-only *modules* (node:* built-ins, pino,
          // database drivers, …) from client code — not file-to-file imports.
          // Add project-specific server-only packages here to catch the next
          // leak in the editor, e.g.:
          //   serverModules: ['nodemailer', 'ioredis'],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', '.astro/**'],
  }
);

