import { execFile } from "node:child_process";
import { mkdirSync, mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  concatPcmS16leWavs,
  pcmS16leToWav,
  readWavDurationSeconds,
  writeSilentWav,
} from "./wav";

const execFileAsync = promisify(execFile);

export type VoiceoverProvider =
  | "silent"
  | "macos-say"
  | "cosyvoice"
  | "cosyvoice-clone";

export type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  ok: boolean;
  status: number;
}>;

export type GenerateVoiceoverOptions = {
  baseUrl?: string;
  durationSeconds?: number;
  request?: FetchLike;
  outputPath: string;
  provider: VoiceoverProvider;
  text: string;
  timeoutMs?: number;
  voice?: string;
};

export type GenerateVoiceoverResult = {
  durationSeconds: number;
  outputPath: string;
  provider: VoiceoverProvider;
};

export type GenerateSceneAlignedVoiceoverOptions = Omit<
  GenerateVoiceoverOptions,
  "outputPath" | "text"
> & {
  outputPath: string;
  sceneTexts: string[];
};

export type GenerateSceneAlignedVoiceoverResult = GenerateVoiceoverResult & {
  sceneDurationsSeconds: number[];
};

export const generateSceneAlignedCosyVoiceover = async ({
  outputPath,
  sceneTexts,
  ...options
}: GenerateSceneAlignedVoiceoverOptions): Promise<GenerateSceneAlignedVoiceoverResult> => {
  if (options.provider !== "cosyvoice") {
    throw new Error("Scene-aligned voiceover is only supported for CosyVoice.");
  }

  if (sceneTexts.length === 0 || sceneTexts.some((text) => text.trim() === "")) {
    throw new Error("Scene-aligned voiceover requires non-empty scene text.");
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-cosyvoice-scenes-"));
  try {
    const segmentResults: GenerateVoiceoverResult[] = [];

    for (const [index, text] of sceneTexts.entries()) {
      segmentResults.push(
        await generateVoiceover({
          ...options,
          outputPath: path.join(tempDir, `scene-${index + 1}.wav`),
          text,
        }),
      );
    }

    concatPcmS16leWavs({
      inputPaths: segmentResults.map((result) => result.outputPath),
      outputPath,
    });

    return {
      durationSeconds: readWavDurationSeconds(outputPath),
      outputPath,
      provider: "cosyvoice",
      sceneDurationsSeconds: segmentResults.map(
        (result) => result.durationSeconds,
      ),
    };
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

export const generateVoiceover = async ({
  baseUrl,
  durationSeconds,
  outputPath,
  provider,
  request = fetch,
  text,
  timeoutMs = 60_000,
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

  if (provider === "cosyvoice") {
    if (!baseUrl) {
      throw new Error("CosyVoice requires AI_REMOTION_TTS_BASE_URL.");
    }

    if (!voice) {
      throw new Error("CosyVoice requires AI_REMOTION_TTS_VOICE as its speaker ID.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await request(toCosyVoiceUrl(baseUrl), {
        body: new URLSearchParams({
          spk_id: voice,
          tts_text: text,
        }),
        method: "POST",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`CosyVoice request failed with status ${response.status}.`);
      }

      const temporaryPath = `${outputPath}.tmp`;
      writeFileSync(
        temporaryPath,
        pcmS16leToWav(Buffer.from(await response.arrayBuffer()), {
          sampleRate: 22_050,
        }),
      );

      try {
        const measuredDurationSeconds = readWavDurationSeconds(temporaryPath);
        renameSync(temporaryPath, outputPath);
        return {
          durationSeconds: measuredDurationSeconds,
          outputPath,
          provider,
        };
      } catch (error) {
        rmSync(temporaryPath, { force: true });
        throw error;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`CosyVoice request timed out after ${timeoutMs}ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (provider === "cosyvoice-clone") {
    throw new Error(
      "CosyVoice clone requires a reference audio file and must use the scene-aligned clone workflow.",
    );
  }

  provider satisfies never;
  throw new Error(`Unsupported voiceover provider: ${provider}`);
};

const toCosyVoiceUrl = (baseUrl: string): string => {
  return new URL("inference_sft", `${baseUrl.replace(/\/+$/, "")}/`).toString();
};
