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
    // Generated Serwist service worker — a minified build artifact, not source.
    // (Gitignored, so absent in CI; ignore here so local lint matches CI.)
    "public/sw.js",
    "public/sw.js.map",
  ]),
  {
    // React-Compiler-readiness lints from eslint-plugin-react-hooks v6. This
    // project has NOT enabled React Compiler yet (see CLAUDE.md), and ci.yml runs
    // `eslint .` (warnings allowed, not --max-warnings 0). Keep these as warnings
    // — visible but non-blocking — until the dedicated cleanup pass, instead of
    // failing CI on pervasive legacy patterns.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/purity": "warn",
    },
  },
]);

export default eslintConfig;
