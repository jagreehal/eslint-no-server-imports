import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import noServerImports from 'eslint-plugin-no-server-imports';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['**/*.{ts,tsx}'],
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
          clientFilePatterns: [
            '**/+page.ts',
            '**/+layout.ts',
            '**/src/lib/**',
          ],
          serverFilePatterns: [
            '**/*.server.ts',
            '**/*.server.tsx',
            '**/*.server.js',
            '**/+server.ts',
            '**/+page.server.ts',
            '**/+layout.server.ts',
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.svelte'],
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
          clientFilePatterns: [
            '**/*.svelte',
            '**/+page.svelte',
            '**/+layout.svelte',
          ],
          serverFilePatterns: [
            '**/*.server.ts',
            '**/*.server.tsx',
            '**/*.server.js',
            '**/+server.ts',
            '**/+page.server.ts',
            '**/+layout.server.ts',
          ],
        },
      ],
    },
  },
  {
    ignores: ['build/**', '.svelte-kit/**'],
  }
);

