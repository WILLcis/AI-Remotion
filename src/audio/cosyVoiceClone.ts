import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { FetchLike } from "./voiceover";
import {
  concatPcmS16leWavs,
  pcmS16leToWav,
  readWavDurationSeconds,
  writeSilentWav,
} from "./wav";

export type GenerateSceneAlignedCosyVoiceCloneOptions = {
  baseUrl: string;
  outputPath: string;
  referenceAudioPath: string;
  referenceText: string;
  request?: FetchLike;
  sampleRate?: number;
  segmentsDir?: string;
  sceneTexts: string[];
  targetSceneDurationsSeconds?: number[];
  timeoutMs?: number;
};

export type GenerateSceneAlignedCosyVoiceCloneResult = {
  durationSeconds: number;
  outputPath: string;
  provider: "cosyvoice-clone";
  segmentPaths: string[];
  sceneDurationsSeconds: number[];
};

export const generateSceneAlignedCosyVoiceClone = async ({
  baseUrl,
  outputPath,
  referenceAudioPath,
  referenceText,
  request = fetch,
  sampleRate = 24_000,
  segmentsDir,
  sceneTexts,
  targetSceneDurationsSeconds,
  timeoutMs = 300_000,
}: GenerateSceneAlignedCosyVoiceCloneOptions): Promise<GenerateSceneAlignedCosyVoiceCloneResult> => {
  if (!existsSync(referenceAudioPath)) {
    throw new Error(`Missing voice clone reference audio: ${referenceAudioPath}`);
  }

  if (referenceText.trim() === "") {
    throw new Error("Voice clone reference transcript must be non-empty.");
  }

  if (sceneTexts.length === 0 || sceneTexts.some((text) => text.trim() === "")) {
    throw new Error("Voice clone requires non-empty scene text.");
  }
  if (
    targetSceneDurationsSeconds &&
    (targetSceneDurationsSeconds.length !== sceneTexts.length ||
      targetSceneDurationsSeconds.some((duration) => duration <= 0))
  ) {
    throw new Error("Voice clone target scene durations must match scene texts.");
  }

  const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-cosyvoice-clone-"));
  try {
    const segmentPaths: string[] = [];
    const sceneDurationsSeconds: number[] = [];

    for (const [index, text] of sceneTexts.entries()) {
      const outputSegmentPath = path.join(tempDir, `scene-${index + 1}.wav`);
      const phrasePaths: string[] = [];
      for (const [phraseIndex, phrase] of splitCosyVoiceText(text).entries()) {
        const phrasePath = path.join(
          tempDir,
          `scene-${index + 1}-phrase-${phraseIndex + 1}.wav`,
        );
        await requestClonedScene({
          baseUrl,
          outputPath: phrasePath,
          referenceAudioPath,
          referenceText,
          request,
          sampleRate,
          text: phrase,
          timeoutMs,
        });
        phrasePaths.push(phrasePath);
      }
      concatPcmS16leWavs({ inputPaths: phrasePaths, outputPath: outputSegmentPath });
      const targetDuration = targetSceneDurationsSeconds?.[index];
      const actualDuration = readWavDurationSeconds(outputSegmentPath);
      if (targetDuration && actualDuration > targetDuration) {
        throw new Error(
          `Voice clone scene ${index + 1} exceeds its target duration (${actualDuration.toFixed(3)}s > ${targetDuration.toFixed(3)}s).`,
        );
      }
      if (targetDuration && actualDuration < targetDuration) {
        const silencePath = path.join(tempDir, `scene-${index + 1}-silence.wav`);
        writeSilentWav({
          durationSeconds: targetDuration - actualDuration,
          outputPath: silencePath,
          sampleRate,
        });
        concatPcmS16leWavs({
          inputPaths: [outputSegmentPath, silencePath],
          outputPath: `${outputSegmentPath}.padded.wav`,
        });
        renameSync(`${outputSegmentPath}.padded.wav`, outputSegmentPath);
      }
      const persistedSegmentPath = segmentsDir
        ? path.join(segmentsDir, `scene-${index + 1}.wav`)
        : outputSegmentPath;
      if (segmentsDir) {
        mkdirSync(segmentsDir, { recursive: true });
        copyFileSync(outputSegmentPath, persistedSegmentPath);
      }
      segmentPaths.push(persistedSegmentPath);
      sceneDurationsSeconds.push(readWavDurationSeconds(outputSegmentPath));
    }

    concatPcmS16leWavs({
      inputPaths: segmentPaths,
      outputPath,
    });

    return {
      durationSeconds: readWavDurationSeconds(outputPath),
      outputPath,
      provider: "cosyvoice-clone",
      segmentPaths,
      sceneDurationsSeconds,
    };
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
};

export const splitCosyVoiceText = (text: string): string[] =>
  text
    .split(/(?<=[。！？；])/u)
    .map((phrase) => phrase.trim())
    .filter(Boolean);

const requestClonedScene = async ({
  baseUrl,
  outputPath,
  referenceAudioPath,
  referenceText,
  request,
  sampleRate,
  text,
  timeoutMs,
}: {
  baseUrl: string;
  outputPath: string;
  referenceAudioPath: string;
  referenceText: string;
  request: FetchLike;
  sampleRate: number;
  text: string;
  timeoutMs: number;
}): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const form = new FormData();
  form.set("tts_text", text);
  form.set("prompt_text", referenceText);
  form.set(
    "prompt_wav",
    new Blob([readFileSync(referenceAudioPath)], { type: "audio/wav" }),
    path.basename(referenceAudioPath),
  );

  try {
    const response = await request(toCosyVoiceCloneUrl(baseUrl), {
      body: form,
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`CosyVoice clone request failed with status ${response.status}.`);
    }

    const temporaryPath = `${outputPath}.tmp`;
    writeFileSync(
      temporaryPath,
      pcmS16leToWav(Buffer.from(await response.arrayBuffer()), {
        sampleRate,
      }),
    );

    try {
      readWavDurationSeconds(temporaryPath);
      renameSync(temporaryPath, outputPath);
    } catch (error) {
      rmSync(temporaryPath, { force: true });
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`CosyVoice clone request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const toCosyVoiceCloneUrl = (baseUrl: string): string => {
  return new URL("inference_zero_shot", `${baseUrl.replace(/\/+$/, "")}/`).toString();
};
