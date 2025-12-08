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
          clientFilePatterns: ["**/app/**", "**/components/**"],
          serverFilePatterns: ["**/*.server.{ts,tsx,js}", "**/api/**"],
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
