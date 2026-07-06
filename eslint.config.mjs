import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "episodes/**/out/**",
      ".agents/**",
      ".codex/**",
      "flags/**",
      "prompts/**",
      "scripts/**",
      "state/**",
      "tools/**",
    ],
  },
];
