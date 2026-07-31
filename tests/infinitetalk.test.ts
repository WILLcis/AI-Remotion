import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateInfiniteTalkAvatar } from "../src/avatar/infinitetalk";

describe("InfiniteTalk avatar provider", () => {
  it("uploads a portrait and scene audio then atomically writes an avatar clip", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-infinitetalk-"));
    const photoPath = path.join(tempDir, "portrait.png");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    let requestUrl = "";

    try {
      writeFileSync(photoPath, Buffer.from("image"));
      writeFileSync(audioPath, Buffer.from("audio"));
      await generateInfiniteTalkAvatar({
        audioPath,
        baseUrl: "http://127.0.0.1:8005",
        outputPath,
        photoPath,
        request: async (url, init) => {
          requestUrl = url;
          expect(init.body).toBeInstanceOf(FormData);
          return new Response(Buffer.from("video"));
        },
      });

      expect(requestUrl).toBe("http://127.0.0.1:8005/generate");
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails before uploading missing source inputs", async () => {
    await expect(
      generateInfiniteTalkAvatar({
        audioPath: "/missing/audio.wav",
        baseUrl: "http://127.0.0.1:8005",
        outputPath: "/tmp/unused.mp4",
        photoPath: "/missing/portrait.png",
      }),
    ).rejects.toThrow(/Missing InfiniteTalk portrait/);
  });
});
