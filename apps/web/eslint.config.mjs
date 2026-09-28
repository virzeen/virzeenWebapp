import boundaries from "eslint-plugin-boundaries";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next.js + a11y + hooks rules, plus the layer boundaries from docs/architecture.md.
const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [
      ".next/**",
      ".next-e2e/**",
      "next-env.d.ts",
      "playwright-report/**",
      "test-results/**",
      "public/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "boundaries/include": ["src/**/*"],
      "boundaries/elements": [
        { type: "server-actions", pattern: "src/server/actions/**", partialMatch: false },
        { type: "server", pattern: "src/server/**", partialMatch: false },
        { type: "client", pattern: "src/client/**", partialMatch: false },
        { type: "app", pattern: "src/app/**", partialMatch: false },
      ],
    },
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            // Client code may import only Server Actions from the server side (CLAUDE.md §5.7).
            {
              from: { element: { type: "client" } },
              disallow: [{ to: { element: { type: "server" } } }],
              message: "Client code may import only Server Actions (@/server/actions/*).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@virzeen/core",
              message: "Client code can't import core. Pass data as props or call a Server Action.",
            },
            { name: "@virzeen/db", message: "Client code can't import the database." },
          ],
        },
      ],
    },
  },
];

export default config;
