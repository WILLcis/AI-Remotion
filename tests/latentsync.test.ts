import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateLatentSyncAvatar } from "../src/avatar/latentsync";

describe("LatentSync avatar provider", () => {
  it("uploads a source video and scene audio then writes a silent avatar clip", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-latentsync-"));
    const sourceVideoPath = path.join(tempDir, "source.mp4");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    let requestUrl = "";

    try {
      writeFileSync(sourceVideoPath, Buffer.from("video"));
      writeFileSync(audioPath, Buffer.from("audio"));
      await generateLatentSyncAvatar({
        audioPath,
        baseUrl: "http://127.0.0.1:8004",
        outputPath,
        sourceVideoPath,
        request: async (url, init) => {
          requestUrl = url;
          expect(init.body).toBeInstanceOf(FormData);
          return new Response(Buffer.from("video"));
        },
      });

      expect(requestUrl).toBe("http://127.0.0.1:8004/generate");
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails before uploading missing source inputs", async () => {
    await expect(
      generateLatentSyncAvatar({
        audioPath: "/missing/audio.wav",
        baseUrl: "http://127.0.0.1:8004",
        outputPath: "/tmp/unused.mp4",
        sourceVideoPath: "/missing/source.mp4",
      }),
    ).rejects.toThrow(/Missing LatentSync source video/);
  });
});
