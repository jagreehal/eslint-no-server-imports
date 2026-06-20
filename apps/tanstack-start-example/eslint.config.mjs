import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import noServerImports from 'eslint-plugin-no-server-imports';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
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
          // Files to check. In TanStack Start, client code lives under routes/
          // and components/.
          clientFilePatterns: ['**/routes/**', '**/components/**'],

          // Files that are genuinely server-only. The rule skips them entirely,
          // so they may import Node-only modules freely. Client routes that
          // import the server functions these files export receive an RPC stub
          // at build time, which the rule does NOT flag — so there are no false
          // positives on the legitimate `import { fn } from '../server/...'`.
          serverFilePatterns: ['**/*.server.ts', '**/server/**'],

          // The rule bans genuinely Node-only *modules* from client code, not
          // file-to-file imports. Common ones — node:* built-ins, pino, database
          // drivers, and many more — are detected out of the box. Add project-
          // specific server-only packages here to catch the next leak in the
          // editor, e.g.:
          //   serverModules: ['nodemailer', 'ioredis'],

          // Recognise TanStack Start server functions: server-only modules used
          // only inside a createServerFn().handler() are allowed.
          checkServerFunctions: true,
          serverFunctionNames: ['createServerFn', 'createIsomorphicFn', 'createServerOnlyFn'],
        },
      ],
    },
  },
  {
    ignores: ['.output/**', '.vinxi/**', 'node_modules/**'],
  }
);
