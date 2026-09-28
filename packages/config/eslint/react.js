// Adds React hooks + accessibility rules for UI packages (docs/ui/ui-discipline.md §8).
import globals from "globals";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { base } from "./base.js";

export const react = tseslint.config(
  ...base,
  jsxA11y.flatConfigs.strict,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
  },
);

export default react;
