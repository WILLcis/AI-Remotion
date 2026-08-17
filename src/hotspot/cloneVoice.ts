import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { flags, FLAGS } from "../../flags/feature-flags";
import { generateSceneAlignedCosyVoiceClone } from "../audio/cosyVoiceClone";
import { loadRuntimeConfig } from "../config/runtimeConfig";

const execFileAsync = promisify(execFile);
const CLONE_REFERENCE_MAX_SECONDS = 15;

export const readAudioTranscriptSidecar = (audioPath: string): string | undefined => {
  const sidecar = `${audioPath.replace(/\.[^.]+$/, "")}.txt`;
  if (!existsSync(sidecar)) {
    return undefined;
  }
  const text = readFileSync(sidecar, "utf8").trim();
  return text || undefined;
};

export const resolveAudioTranscript = (
  audioPath: string,
  explicit?: string,
): string | undefined => {
  const fromFlag = explicit?.trim();
  if (fromFlag) {
    return fromFlag;
  }
  return readAudioTranscriptSidecar(audioPath);
};

const prepareCloneReference = async (input: {
  audioPath: string;
  outputWav: string;
}): Promise<string> => {
  if (!existsSync(input.audioPath)) {
    throw new Error(`Voice clone reference audio not found: ${input.audioPath}`);
  }
  mkdirSync(path.dirname(input.outputWav), { recursive: true });
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    input.audioPath,
    "-t",
    String(CLONE_REFERENCE_MAX_SECONDS),
    "-ar",
    "24000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    input.outputWav,
  ]);
  return input.outputWav;
};

export const cloneHotspotSpokenAudio = async (input: {
  referenceAudioPath: string;
  referenceText: string;
  spoken: string;
  outputWav: string;
  clone?: typeof generateSceneAlignedCosyVoiceClone;
}): Promise<{ durationSeconds: number; outputPath: string }> => {
  if (!input.spoken.trim()) {
    throw new Error("Voice clone requires non-empty spoken script text.");
  }
  if (!input.referenceText.trim()) {
    throw new Error("Voice clone reference transcript must be non-empty.");
  }
  if (!(await flags.isEnabled(FLAGS.VOICE_CLONE, { isTeamMember: true }))) {
    throw new Error(
      'Voice cloning is disabled. Set FLAG_voice_clone=\'{"enabled":true}\' for an approved internal run.',
    );
  }
  const config = loadRuntimeConfig();
  if (!config.tts.baseUrl) {
    throw new Error("CosyVoice clone requires AI_REMOTION_TTS_BASE_URL.");
  }
  const referenceWav = await prepareCloneReference({
    audioPath: input.referenceAudioPath,
    outputWav: path.join(path.dirname(input.outputWav), "clone-reference.wav"),
  });
  const clone = input.clone ?? generateSceneAlignedCosyVoiceClone;
  const result = await clone({
    baseUrl: config.tts.baseUrl,
    outputPath: input.outputWav,
    referenceAudioPath: referenceWav,
    referenceText: input.referenceText.trim(),
    sceneTexts: [input.spoken.trim()],
    timeoutMs: config.tts.requestTimeoutMs,
  });
  return { durationSeconds: result.durationSeconds, outputPath: result.outputPath };
};
