import nextVitals from "eslint-config-next/core-web-vitals";

export default [
  ...nextVitals,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-dev/**",
      "dist/**",
      "supabase/functions/**",
      ".local/**",
      "attached_assets/**",
    ],
  },
];
