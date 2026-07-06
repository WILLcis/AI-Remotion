import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateVoiceover } from "../src/audio/voiceover";
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
});
