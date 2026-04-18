import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Demo fixture repos are deliberately broken/compliant sample code used
    // as audit *input*. They are not part of the app and shouldn't be
    // linted — FinovaBank in particular contains require() imports and
    // unused params by design.
    "demo/**",
  ]),
]);

export default eslintConfig;
