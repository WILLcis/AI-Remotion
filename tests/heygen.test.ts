import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateHeyGenAvatar, verifyHeyGenAccount } from "../src/avatar/heygen";

describe("HeyGen avatar provider", () => {
  it("uploads local image and audio assets, polls the video, and writes an audit manifest", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-heygen-"));
    const photoPath = path.join(tempDir, "presenter.png");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    const manifestPath = path.join(tempDir, "manifest.json");
    const calls: Array<{ method: string; url: string }> = [];
    let assetUploads = 0;

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      writeFileSync(audioPath, Buffer.from("audio"));
      const result = await generateHeyGenAvatar({
        apiKey: "heygen-test-secret",
        audioPath,
        baseUrl: "https://api.heygen.example.test",
        durationSeconds: 7.6,
        episodeId: "avatar-demo",
        manifestPath,
        outputPath,
        photoPath,
        request: async (input, init) => {
          calls.push({ method: init?.method ?? "GET", url: input });
          if (input.endsWith("/v3/assets")) {
            assetUploads += 1;
            expect(init?.body).toBeInstanceOf(FormData);
            return jsonResponse({ data: { asset_id: `asset-${assetUploads}` } });
          }
          if (init?.method === "POST") {
            expect(new Headers(init?.headers).get("X-Api-Key")).toBe("heygen-test-secret");
            expect(new Headers(init?.headers).get("Idempotency-Key")).toBeTruthy();
            return jsonResponse({ data: { status: "pending", video_id: "video-123" } });
          }
          if (input.endsWith("/v3/videos/video-123")) {
            return jsonResponse({
              data: { status: "completed", video_url: "https://video.example.test/result.mp4" },
            });
          }
          return new Response(Buffer.from("video"));
        },
        sceneId: "scene-01",
        sleep: async () => undefined,
      });

      expect(calls).toEqual([
        { method: "POST", url: "https://api.heygen.example.test/v3/assets" },
        { method: "POST", url: "https://api.heygen.example.test/v3/assets" },
        { method: "POST", url: "https://api.heygen.example.test/v3/videos" },
        { method: "GET", url: "https://api.heygen.example.test/v3/videos/video-123" },
        { method: "GET", url: "https://video.example.test/result.mp4" },
      ]);
      expect(result.videoId).toBe("video-123");
      expect(existsSync(outputPath)).toBe(true);
      expect(readFileSync(manifestPath, "utf8")).toContain("video-123");
      expect(readFileSync(manifestPath, "utf8")).not.toContain("heygen-test-secret");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("backs off after a rate-limit response without resubmitting the video", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-heygen-retry-"));
    const photoPath = path.join(tempDir, "presenter.png");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    let createRequests = 0;
    let pollRequests = 0;
    const sleeps: number[] = [];

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      writeFileSync(audioPath, Buffer.from("audio"));
      await generateHeyGenAvatar({
        apiKey: "heygen-test-secret",
        audioPath,
        durationSeconds: 7.6,
        episodeId: "avatar-demo",
        outputPath,
        photoPath,
        request: async (input, init) => {
          if (input.endsWith("/v3/assets")) {
            return jsonResponse({ data: { asset_id: "asset-123" } });
          }
          if (init?.method === "POST") {
            createRequests += 1;
            return jsonResponse({ data: { video_id: "video-123" } });
          }
          if (input.endsWith("/v3/videos/video-123")) {
            pollRequests += 1;
            if (pollRequests === 1) {
              return new Response(JSON.stringify({ error: { message: "slow down" } }), {
                headers: { "Retry-After": "2", "content-type": "application/json" },
                status: 429,
              });
            }
            return jsonResponse({
              data: { status: "completed", video_url: "https://video.example.test/result.mp4" },
            });
          }
          return new Response(Buffer.from("video"));
        },
        sceneId: "scene-01",
        sleep: async (milliseconds) => {
          sleeps.push(milliseconds);
        },
      });

      expect(createRequests).toBe(1);
      expect(pollRequests).toBe(2);
      expect(sleeps).toContain(2_000);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails before calling HeyGen when local inputs are missing", async () => {
    await expect(
      generateHeyGenAvatar({
        apiKey: "heygen-test-secret",
        audioPath: "/missing/audio.wav",
        durationSeconds: 1,
        episodeId: "avatar-demo",
        outputPath: "/tmp/unused.mp4",
        photoPath: "/missing/portrait.png",
        sceneId: "scene-01",
      }),
    ).rejects.toThrow(/Missing HeyGen presenter photo/);
  });

  it("verifies an API key without leaking it", async () => {
    await expect(
      verifyHeyGenAccount({
        apiKey: "heygen-test-secret",
        baseUrl: "https://api.heygen.example.test",
        request: async (input, init) => {
          expect(input).toBe("https://api.heygen.example.test/v3/users/me");
          expect(new Headers(init?.headers).get("X-Api-Key")).toBe("heygen-test-secret");
          return jsonResponse({ data: { id: "user-123" } });
        },
      }),
    ).resolves.toBeUndefined();
  });
});

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
