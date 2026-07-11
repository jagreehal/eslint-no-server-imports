import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginUnicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["lib/**", "dist/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  eslintPluginUnicorn.configs.recommended,
  {
    rules: {
      "unicorn/prevent-abbreviations": "off",
      "unicorn/consistent-function-scoping": "off",
      "unicorn/no-null": "off",
      // New in eslint-plugin-unicorn 68 (bumped from 63); the codebase
      // predates them. Revisit individually outside feature work.
      "unicorn/name-replacements": "off",
      "unicorn/consistent-boolean-name": "off",
      "unicorn/no-top-level-assignment-in-function": "off",
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/no-declarations-before-early-exit": "off",
      "unicorn/no-useless-recursion": "off",
    },
  },
);
