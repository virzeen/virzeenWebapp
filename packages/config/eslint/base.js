// Shared ESLint flat config for every TypeScript package (docs/conventions.md "Code style").
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export const base = tseslint.config(
  { ignores: ["**/node_modules/**", "**/dist/**", "**/.turbo/**", "**/coverage/**", "**/generated/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.node } },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    },
  },
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/test/**",
      "**/tests/**",
      "**/scripts/**",
      "**/prisma/seed*.ts",
    ],
    rules: { "no-console": "off" },
  },
);

export default base;
