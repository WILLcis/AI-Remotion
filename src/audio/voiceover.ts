import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { readWavDurationSeconds, writeSilentWav } from "./wav";

const execFileAsync = promisify(execFile);

export type VoiceoverProvider = "silent" | "macos-say";

export type GenerateVoiceoverOptions = {
  durationSeconds?: number;
  outputPath: string;
  provider: VoiceoverProvider;
  text: string;
  voice?: string;
};

export type GenerateVoiceoverResult = {
  durationSeconds: number;
  outputPath: string;
  provider: VoiceoverProvider;
};

export const generateVoiceover = async ({
  durationSeconds,
  outputPath,
  provider,
  text,
  voice,
}: GenerateVoiceoverOptions): Promise<GenerateVoiceoverResult> => {
  mkdirSync(path.dirname(outputPath), { recursive: true });

  if (provider === "silent") {
    if (durationSeconds === undefined) {
      throw new Error("silent voiceover provider requires durationSeconds");
    }

    writeSilentWav({ durationSeconds, outputPath });
    return {
      durationSeconds: readWavDurationSeconds(outputPath),
      outputPath,
      provider,
    };
  }

  if (provider === "macos-say") {
    const args = ["-o", outputPath, "--data-format=LEF32@22050"];
    if (voice) {
      args.push("-v", voice);
    }
    args.push(text);

    await execFileAsync("say", args);
    return {
      durationSeconds: readWavDurationSeconds(outputPath),
      outputPath,
      provider,
    };
  }

  provider satisfies never;
  throw new Error(`Unsupported voiceover provider: ${provider}`);
};
