import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getSceneTimings } from "../src/audio/sceneTiming";
import { generateSceneAlignedCosyVoiceClone } from "../src/audio/cosyVoiceClone";
import { generateVoiceover } from "../src/audio/voiceover";
import { resolveConfiguredVoiceoverProvider } from "../src/audio/voiceoverConfig";
import { readWavDurationSeconds } from "../src/audio/wav";

describe("voiceover providers", () => {
  it("writes a measurable silent wav voiceover for deterministic tests", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-voice-"));
    const outputPath = path.join(tempDir, "voiceover.wav");

    try {
      const result = await generateVoiceover({
        durationSeconds: 1.25,
        outputPath,
        provider: "silent",
        text: "hello",
      });

      expect(existsSync(outputPath)).toBe(true);
      expect(result.durationSeconds).toBeCloseTo(1.25, 2);
      expect(readWavDurationSeconds(outputPath)).toBeCloseTo(1.25, 2);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("uses configured implemented providers and rejects pending external providers", () => {
    expect(resolveConfiguredVoiceoverProvider(undefined, "silent")).toBe("silent");
    expect(resolveConfiguredVoiceoverProvider("macos-say", "silent")).toBe(
      "macos-say",
    );
    expect(resolveConfiguredVoiceoverProvider(undefined, "cosyvoice")).toBe(
      "cosyvoice",
    );
    expect(() => resolveConfiguredVoiceoverProvider(undefined, "doubao")).toThrow(
      /not implemented yet/,
    );
  });

  it("allocates contiguous scene frames from measured audio durations", () => {
    expect(
      getSceneTimings({
        durationsSeconds: [1.01, 2.02, 0.97],
        fps: 30,
      }),
    ).toEqual([
      { durationFrames: 30, durationSeconds: 1.01, startFrame: 0 },
      { durationFrames: 61, durationSeconds: 2.02, startFrame: 30 },
      { durationFrames: 29, durationSeconds: 0.97, startFrame: 91 },
    ]);
  });

  it("writes measurable audio returned by CosyVoice", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-cosyvoice-"));
    const outputPath = path.join(tempDir, "voiceover.wav");
    const rawPcm = Buffer.alloc(22_050);
    let requestUrl = "";
    let requestInit: RequestInit | undefined;

    try {
      const result = await generateVoiceover({
        baseUrl: "http://127.0.0.1:50000",
        outputPath,
        provider: "cosyvoice",
        request: async (url, init) => {
          requestUrl = url;
          requestInit = init;
          return new Response(rawPcm);
        },
        text: "你好，世界。",
        voice: "中文女声",
      });

      expect(requestUrl).toBe("http://127.0.0.1:50000/inference_sft");
      expect(requestInit?.method).toBe("POST");
      expect(String(requestInit?.body)).toContain("spk_id=%E4%B8%AD%E6%96%87%E5%A5%B3%E5%A3%B0");
      expect(String(requestInit?.body)).toContain("tts_text=");
      expect(result.durationSeconds).toBeCloseTo(0.5, 2);
      expect(readWavDurationSeconds(outputPath)).toBeCloseTo(0.5, 2);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("clones consented reference audio into persisted scene segments", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-cosyvoice-clone-"));
    const outputPath = path.join(tempDir, "voiceover.wav");
    const referenceAudioPath = path.join(tempDir, "reference.wav");
    const segmentsDir = path.join(tempDir, "segments");
    let requestBody: FormData | undefined;

    try {
      await generateVoiceover({
        durationSeconds: 1,
        outputPath: referenceAudioPath,
        provider: "silent",
        text: "reference",
      });
      const result = await generateSceneAlignedCosyVoiceClone({
        baseUrl: "http://127.0.0.1:50000",
        outputPath,
        referenceAudioPath,
        referenceText: "This is the exact reference transcript.",
        request: async (_url, init) => {
          requestBody = init.body as FormData;
          return new Response(Buffer.alloc(22_050));
        },
        sceneTexts: ["Scene one.", "Scene two."],
        segmentsDir,
      });

      expect(requestBody?.get("prompt_text")).toBe(
        "This is the exact reference transcript.",
      );
      expect(requestBody?.get("prompt_wav")).toBeInstanceOf(Blob);
      expect(result.provider).toBe("cosyvoice-clone");
      expect(result.sceneDurationsSeconds).toEqual([0.459375, 0.459375]);
      expect(result.segmentPaths.every(existsSync)).toBe(true);
      expect(readWavDurationSeconds(outputPath)).toBeCloseTo(0.91875, 2);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails clearly when CosyVoice configuration or audio is invalid", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-cosyvoice-"));
    const outputPath = path.join(tempDir, "voiceover.wav");

    try {
      await expect(
        generateVoiceover({
          outputPath,
          provider: "cosyvoice",
          text: "hello",
          voice: "speaker",
        }),
      ).rejects.toThrow(/AI_REMOTION_TTS_BASE_URL/);
      await expect(
        generateVoiceover({
          baseUrl: "http://127.0.0.1:50000",
          outputPath,
          provider: "cosyvoice",
          text: "hello",
        }),
      ).rejects.toThrow(/AI_REMOTION_TTS_VOICE/);
      await expect(
        generateVoiceover({
          baseUrl: "http://127.0.0.1:50000",
          outputPath,
          provider: "cosyvoice",
          request: async () => new Response("unavailable", { status: 503 }),
          text: "hello",
          voice: "speaker",
        }),
      ).rejects.toThrow(/status 503/);
      await expect(
        generateVoiceover({
          baseUrl: "http://127.0.0.1:50000",
          outputPath,
          provider: "cosyvoice",
          request: async () => new Response(Buffer.alloc(1)),
          text: "hello",
          voice: "speaker",
        }),
      ).rejects.toThrow(/whole 16-bit PCM samples/);
      await expect(
        generateVoiceover({
          baseUrl: "http://127.0.0.1:50000",
          outputPath,
          provider: "cosyvoice",
          request: async () => {
            const error = new Error("aborted");
            error.name = "AbortError";
            throw error;
          },
          text: "hello",
          timeoutMs: 1,
          voice: "speaker",
        }),
      ).rejects.toThrow(/timed out/);
      expect(existsSync(outputPath)).toBe(false);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
