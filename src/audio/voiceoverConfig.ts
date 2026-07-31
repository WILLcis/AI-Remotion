import type { TtsProvider } from "../config/runtimeConfig";
import type { VoiceoverProvider } from "./voiceover";

export const resolveConfiguredVoiceoverProvider = (
  cliProvider: VoiceoverProvider | undefined,
  configuredProvider: TtsProvider,
): VoiceoverProvider => {
  if (cliProvider) {
    return cliProvider;
  }

  if (
    configuredProvider === "silent" ||
    configuredProvider === "macos-say" ||
    configuredProvider === "cosyvoice" ||
    configuredProvider === "cosyvoice-clone"
  ) {
    return configuredProvider;
  }

  throw new Error(
    `TTS provider "${configuredProvider}" is configured but not implemented yet. Use --provider silent, --provider macos-say, --provider cosyvoice, or --provider cosyvoice-clone.`,
  );
};
