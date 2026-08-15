import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_DREAMINA_VIDEO_MODEL,
  dreaminaImage2Video,
  dreaminaQueryResult,
  parseDreaminaSubmitId,
  type DreaminaSpawnResult,
} from "../media/dreaminaCli";
import type { HotspotClip } from "../schemas/hotspot";
import { buildDreaminaVideoPrompt, estimateSpokenDurationSeconds } from "./composeCopy";
import { generateDreaminaCover } from "./cover";

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

const clampDuration = (seconds: number): number =>
  Math.min(15, Math.max(4, Math.round(seconds)));

export type GenerateDigitalHumanClipInput = {
  clip: HotspotClip;
  downloadDir: string;
  approvePaid: boolean;
  cover?: typeof generateDreaminaCover;
  image2video?: typeof dreaminaImage2Video;
  queryResult?: typeof dreaminaQueryResult;
  parseSubmitId?: typeof parseDreaminaSubmitId;
};

export const generateDigitalHumanClip = async (
  input: GenerateDigitalHumanClipInput,
): Promise<{ cover_path: string; video_path: string }> => {
  const clipDir = input.downloadDir;
  mkdirSync(clipDir, { recursive: true });
  const coverFn = input.cover ?? generateDreaminaCover;
  const image2video = input.image2video ?? dreaminaImage2Video;
  const queryResult = input.queryResult ?? dreaminaQueryResult;
  const parseSubmitId = input.parseSubmitId ?? parseDreaminaSubmitId;

  const coverPath = await coverFn({
    clip: input.clip,
    downloadDir: path.join(clipDir, "cover"),
    approvePaid: input.approvePaid,
  });

  const submit = await image2video({
    approvePaid: input.approvePaid,
    downloadDir: clipDir,
    imagePath: coverPath,
    prompt: buildDreaminaVideoPrompt(input.clip),
    durationSeconds: clampDuration(estimateSpokenDurationSeconds(input.clip.spoken)),
    pollSeconds: 600,
    videoResolution: "720p",
    modelVersion: DEFAULT_DREAMINA_VIDEO_MODEL,
  });

  assertNotTns(submit.stdout, submit.stderr, input.clip.index);
  const submitId = parseSubmitId(submit.stdout);
  if (!submitId) {
    throw new Error(
      `Dreamina image2video produced no submit_id for clip ${input.clip.index}. ${clipErrorSnippet(submit.stdout, submit.stderr)}`,
    );
  }

  const videoPath = await waitForDownload({
    clipIndex: input.clip.index,
    downloadDir: clipDir,
    pick: latestMp4,
    query: () => queryResult({ submitId, downloadDir: clipDir }),
    attempts: 30,
    delayMs: 20_000,
    label: "image2video",
  });

  return { video_path: videoPath, cover_path: coverPath };
};
