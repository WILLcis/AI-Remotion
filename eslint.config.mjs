import { config } from "@remotion/eslint-config-flat";

export default [
  ...config,
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".transcription-venv/**",
      "episodes/**/out/**",
      "videos/**",
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
