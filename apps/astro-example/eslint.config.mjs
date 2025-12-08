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
          clientFilePatterns: ['**/pages/**', '**/components/**', '**/islands/**'],
          serverFilePatterns: ['**/*.server.ts', '**/server/**'],
        },
      ],
    },
  },
  {
    ignores: ['dist/**', '.astro/**'],
  }
);

