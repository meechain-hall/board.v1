---
name: ESLint and Next.js CI compatibility
description: ESLint version and flat-config constraints for this Next.js application.
---

Use ESLint 9 with the flat configuration exported by `eslint-config-next`; ESLint 10 currently conflicts with the React rules bundled by the Next.js config. The app's existing data-fetching effects and time-relative rendering also require the React Compiler's `set-state-in-effect` and `purity` rules to remain disabled.

**Why:** A clean CI install must resolve the same peer dependency graph as the local project, and the stricter React Compiler rules flag established runtime patterns rather than build failures.

**How to apply:** Keep lint tooling versions compatible with `eslint-config-next`, run `npm ci` plus lint/typecheck/build/audit before changing the workflow, and only enable those React rules after refactoring the affected components.