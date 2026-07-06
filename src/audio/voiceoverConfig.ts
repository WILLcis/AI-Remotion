import type { TtsProvider } from "../config/runtimeConfig";
import type { VoiceoverProvider } from "./voiceover";

export const resolveConfiguredVoiceoverProvider = (
  cliProvider: VoiceoverProvider | undefined,
  configuredProvider: TtsProvider,
): VoiceoverProvider => {
  if (cliProvider) {
    return cliProvider;
  }

  if (configuredProvider === "silent" || configuredProvider === "macos-say") {
    return configuredProvider;
  }

  throw new Error(
    `TTS provider "${configuredProvider}" is configured but not implemented yet. Use --provider silent or --provider macos-say for now.`,
  );
};
