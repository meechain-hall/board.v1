import nextVitals from "eslint-config-next/core-web-vitals";
import { globalIgnores } from "eslint/config";

export default [
  // The final config entry is the Next.js Core Web Vitals rule set. The preceding
  // entries enable React ecosystem rules that are not yet compatible with ESLint 10.
  nextVitals.at(-1),
  globalIgnores([".next/**", ".next-dev/**"]),
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
  },
];
