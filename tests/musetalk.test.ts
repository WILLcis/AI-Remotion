import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateMuseTalkAvatar } from "../src/avatar/musetalk";

describe("MuseTalk avatar provider", () => {
  it("uploads a local photo and scene audio then writes an avatar clip", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-avatar-"));
    const photoPath = path.join(tempDir, "avatar.jpg");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    let requestUrl = "";

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      writeFileSync(audioPath, Buffer.from("audio"));
      await generateMuseTalkAvatar({
        audioPath,
        baseUrl: "http://127.0.0.1:8001",
        outputPath,
        photoPath,
        request: async (url, init) => {
          requestUrl = url;
          expect(init.body).toBeInstanceOf(FormData);
          return new Response(Buffer.from("video"));
        },
      });

      expect(requestUrl).toBe("http://127.0.0.1:8001/generate");
      expect(existsSync(outputPath)).toBe(true);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails before uploading absent consented inputs", async () => {
    await expect(
      generateMuseTalkAvatar({
        audioPath: "/missing/audio.wav",
        baseUrl: "http://127.0.0.1:8001",
        outputPath: "/tmp/unused.mp4",
        photoPath: "/missing/photo.jpg",
      }),
    ).rejects.toThrow(/Missing avatar source photo/);
  });
});
