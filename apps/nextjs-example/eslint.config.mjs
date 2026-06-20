import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noServerImports from "eslint-plugin-no-server-imports";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      "no-server-imports": noServerImports,
    },
    rules: {
      "no-server-imports/no-server-imports": [
        "error",
        {
          // app/ defaults to Server Components, but we check it as client code
          // for safety — a stray "use client" or a Client Component shouldn't be
          // able to pull in a Node-only module. Keep server work in Server
          // Actions ("use server") or behind a dynamic import().
          clientFilePatterns: ["**/app/**", "**/components/**"],

          // Files that are genuinely server-only and so exempt from the rule.
          serverFilePatterns: ["**/*.server.{ts,tsx,js}", "**/api/**"],

          // The rule bans genuinely Node-only *modules* (node:* built-ins, pino,
          // database drivers, …) from client code — not file-to-file imports, so
          // importing a Server Action from a client component is never flagged.
          // Add project-specific server-only packages here to catch the next
          // leak in the editor, e.g.:
          //   serverModules: ["nodemailer", "ioredis"],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
