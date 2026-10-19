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
      // Style rules this codebase opts out of.
      "unicorn/name-replacements": "off",
      "unicorn/consistent-boolean-name": "off",
      "unicorn/no-top-level-assignment-in-function": "off",
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/no-declarations-before-early-exit": "off",
      "unicorn/no-useless-recursion": "off",
      "unicorn/no-top-level-side-effects": "off",
      "unicorn/prefer-combined-guards": "off",
      "unicorn/prefer-logical-operator-over-ternary": "off",
      "unicorn/prefer-ternary": "off",
      "unicorn/prefer-early-return": "off",
    },
  },
);
