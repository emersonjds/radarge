import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Keep last: disables ESLint stylistic rules that would fight Prettier.
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored TailAdmin template — kept verbatim as the base, not adapted.
    "src/shared/tailadmin/**",
    // Lagune ships its own hooks; they are the tool's, not ours to lint.
    ".lagune/**",
  ]),
]);

export default eslintConfig;
