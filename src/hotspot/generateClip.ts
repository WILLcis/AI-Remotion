import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { readWavDurationSeconds } from "../audio/wav";
import {
  DEFAULT_DREAMINA_VIDEO_MODEL,
  dreaminaImage2Video,
  dreaminaMultimodal2Video,
  dreaminaQueryResult,
  parseDreaminaSubmitId,
  type DreaminaSpawnResult,
} from "../media/dreaminaCli";
import type { HotspotClip } from "../schemas/hotspot";
import { buildDreaminaVideoPrompt, estimateSpokenDurationSeconds } from "./composeCopy";
import { generateDreaminaCover } from "./cover";

const execFileAsync = promisify(execFile);
const DREAMINA_MAX_AUDIO_SECONDS = 15;
const DREAMINA_IDENTITY_MIN_AUDIO_SECONDS = 5;

export const latestMp4 = (dir: string): string | undefined => {
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".mp4"))
    .map((name) => path.join(dir, name))
    .at(-1);
};

export const isDreaminaTnsFailure = (...chunks: string[]): boolean =>
  chunks.some((chunk) => /TNS|未审核通过|审核失败|risk\s*control/i.test(chunk));

const clipErrorSnippet = (stdout: string, stderr: string): string =>
  `${stdout} ${stderr}`.replace(/\s+/g, " ").trim().slice(0, 280);

const assertNotTns = (stdout: string, stderr: string, clipIndex: number): void => {
  if (isDreaminaTnsFailure(stdout, stderr)) {
    throw new Error(
      `即梦 TNS 审核失败：${clipErrorSnippet(stdout, stderr) || `clip ${clipIndex}`}`,
    );
  }
};

const waitForDownload = async (input: {
  clipIndex: number;
  downloadDir: string;
  pick: (dir: string) => string | undefined;
  query: () => Promise<DreaminaSpawnResult>;
  attempts: number;
  delayMs: number;
  label: string;
}): Promise<string> => {
  for (let attempt = 0; attempt < input.attempts; attempt += 1) {
    const result = await input.query();
    assertNotTns(result.stdout, result.stderr, input.clipIndex);
    const found = input.pick(input.downloadDir);
    if (found) {
      return found;
    }
    await new Promise((resolve) => setTimeout(resolve, input.delayMs));
  }
  throw new Error(
    `Dreamina ${input.label} produced no file for clip ${input.clipIndex} after waiting.`,
  );
};

const clampDuration = (seconds: number, maxSeconds = 15): number =>
  Math.min(maxSeconds, Math.max(4, Math.round(seconds)));

export const prepareDreaminaAudio = async (input: {
  audioPath: string;
  outputWav: string;
  maxSeconds?: number;
  minSeconds?: number;
}): Promise<{ durationSeconds: number; outputPath: string }> => {
  if (!existsSync(input.audioPath)) {
    throw new Error(`Driving audio not found: ${input.audioPath}`);
  }
  const maxSeconds = input.maxSeconds ?? DREAMINA_MAX_AUDIO_SECONDS;
  const minSeconds = input.minSeconds ?? 2;
  mkdirSync(path.dirname(input.outputWav), { recursive: true });
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input.audioPath,
    "-t",
    String(maxSeconds),
    "-ar",
    "16000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    input.outputWav,
  ]);
  const durationSeconds = readWavDurationSeconds(input.outputWav);
  if (durationSeconds < minSeconds) {
    throw new Error(
      `Driving audio is ${durationSeconds.toFixed(2)}s; Dreamina needs at least ${minSeconds} seconds.`,
    );
  }
  return {
    durationSeconds: Math.min(maxSeconds, durationSeconds),
    outputPath: input.outputWav,
  };
};

export type GenerateDigitalHumanClipInput = {
  clip: HotspotClip;
  downloadDir: string;
  approvePaid: boolean;
  photoPath?: string;
  audioPath?: string;
  audioTranscript?: string;
  modelVersion?: string;
  cover?: typeof generateDreaminaCover;
  image2video?: typeof dreaminaImage2Video;
  multimodal?: typeof dreaminaMultimodal2Video;
  queryResult?: typeof dreaminaQueryResult;
  parseSubmitId?: typeof parseDreaminaSubmitId;
  prepareAudio?: typeof prepareDreaminaAudio;
};

export const generateDigitalHumanClip = async (
  input: GenerateDigitalHumanClipInput,
): Promise<{ cover_path: string; video_path: string }> => {
  const hasPhoto = Boolean(input.photoPath);
  const hasAudio = Boolean(input.audioPath);
  if (hasPhoto !== hasAudio) {
    throw new Error("User photo and audio must be provided together for Dreamina identity generation.");
  }
  if (input.photoPath && !existsSync(input.photoPath)) {
    throw new Error(`User photo not found: ${input.photoPath}`);
  }

  const clipDir = input.downloadDir;
  mkdirSync(clipDir, { recursive: true });
  const coverFn = input.cover ?? generateDreaminaCover;
  const image2video = input.image2video ?? dreaminaImage2Video;
  const multimodal = input.multimodal ?? dreaminaMultimodal2Video;
  const queryResult = input.queryResult ?? dreaminaQueryResult;
  const parseSubmitId = input.parseSubmitId ?? parseDreaminaSubmitId;
  const prepareAudio = input.prepareAudio ?? prepareDreaminaAudio;

  const coverPath = await coverFn({
    clip: input.clip,
    downloadDir: path.join(clipDir, "cover"),
    approvePaid: input.approvePaid,
    photoPath: input.photoPath,
  });

  const identity = Boolean(input.photoPath && input.audioPath);
  const modelVersion = input.modelVersion ?? DEFAULT_DREAMINA_VIDEO_MODEL;
  let submit: DreaminaSpawnResult;
  let mode: "multimodal2video" | "image2video";
  let durationSeconds = clampDuration(estimateSpokenDurationSeconds(input.clip.spoken));

  if (identity && input.photoPath && input.audioPath) {
    const audio = await prepareAudio({
      audioPath: input.audioPath,
      outputWav: path.join(clipDir, "voice-ref.wav"),
      maxSeconds: DREAMINA_MAX_AUDIO_SECONDS,
      minSeconds: DREAMINA_IDENTITY_MIN_AUDIO_SECONDS,
    });
    durationSeconds = clampDuration(estimateSpokenDurationSeconds(input.clip.spoken));
    mode = "multimodal2video";
    submit = await multimodal({
      approvePaid: input.approvePaid,
      imagePaths: [coverPath, input.photoPath],
      audioPaths: [audio.outputPath],
      prompt: buildDreaminaVideoPrompt(input.clip, {
        identityFromPhoto: true,
        audioTranscript: input.audioTranscript,
      }),
      durationSeconds,
      pollSeconds: 600,
      ratio: "9:16",
      videoResolution: "720p",
      modelVersion,
    });
  } else {
    mode = "image2video";
    submit = await image2video({
      approvePaid: input.approvePaid,
      downloadDir: clipDir,
      imagePath: coverPath,
      prompt: buildDreaminaVideoPrompt(input.clip),
      durationSeconds,
      pollSeconds: 600,
      videoResolution: "720p",
      modelVersion,
    });
  }

  assertNotTns(submit.stdout, submit.stderr, input.clip.index);
  const submitId = parseSubmitId(submit.stdout);
  if (!submitId) {
    throw new Error(
      `Dreamina ${mode} produced no submit_id for clip ${input.clip.index}. ${clipErrorSnippet(submit.stdout, submit.stderr)}`,
    );
  }

  const videoPath = await waitForDownload({
    clipIndex: input.clip.index,
    downloadDir: clipDir,
    pick: latestMp4,
    query: () => queryResult({ submitId, downloadDir: clipDir }),
    attempts: 30,
    delayMs: 20_000,
    label: mode,
  });

  return { video_path: videoPath, cover_path: coverPath };
};
