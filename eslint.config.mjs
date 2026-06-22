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
    // Serwist precache worker — generated build artifact, not source.
    "public/swe-worker-*.js",
    // Node/Playwright perf-measurement scripts (run manually, not app code).
    "bench-virtual.cjs",
    "scripts/**",
    // Stale repo backup — an accidentally-embedded nested git repo, untracked and
    // gitignored. Excluded so `eslint .` stops traversing a duplicate source tree.
    "trello-replica-backup/**",
    // Installed skill/agent tooling (third-party vendored scripts). Not app
    // source — exclude so `eslint .` doesn't lint vendored tooling. `.claude/`
    // holds committed skill bundles (e.g. impeccable's detector scripts) whose
    // hundreds of upstream warnings would otherwise fail the --max-warnings 0 CI.
    ".agents/**",
    ".claude/**",
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
