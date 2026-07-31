import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createTosSeedanceUploader,
  generateSeedanceAvatar,
  getSeedanceVideoNormalizationCommand,
} from "../src/avatar/seedance";

describe("Seedance avatar provider", () => {
  it("uploads consented inputs, polls Ark, downloads a clip, and records metadata", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-seedance-"));
    const photoPath = path.join(tempDir, "presenter.png");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    const manifestPath = path.join(tempDir, "manifest.json");
    const calls: Array<{ method: string; url: string }> = [];

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      writeFileSync(audioPath, Buffer.from("audio"));

      const result = await generateSeedanceAvatar({
        arkApiKey: "ark-test-secret",
        arkBaseUrl: "https://ark.example.test/api/v3",
        arkModel: "doubao-seedance-test",
        audioPath,
        durationSeconds: 7.6,
        episodeId: "avatar-demo",
        manifestPath,
        outputPath,
        photoPath,
        prompt: "主播面向镜头，自然手势讲解。",
        request: async (input, init) => {
          calls.push({ method: init?.method ?? "GET", url: input });
          if (init?.method === "POST") {
            return jsonResponse({ id: "task-123", status: "queued" });
          }
          if (input.endsWith("/task-123")) {
            return jsonResponse({
              content: { video_url: "https://video.example.test/result.mp4" },
              id: "task-123",
              status: "succeeded",
            });
          }
          return new Response(Buffer.from("video"));
        },
        sceneId: "scene-01",
        sleep: async () => undefined,
        uploadAsset: async ({ kind }) => `https://tos.example.test/${kind}`,
      });

      expect(calls).toEqual([
        {
          method: "POST",
          url: "https://ark.example.test/api/v3/contents/generations/tasks",
        },
        {
          method: "GET",
          url: "https://ark.example.test/api/v3/contents/generations/tasks/task-123",
        },
        {
          method: "GET",
          url: "https://video.example.test/result.mp4",
        },
      ]);
      expect(existsSync(outputPath)).toBe(true);
      expect(result.taskId).toBe("task-123");
      expect(result.durationSeconds).toBe(7.6);
      expect(readFileSync(manifestPath, "utf8")).toContain("task-123");
      expect(readFileSync(manifestPath, "utf8")).not.toContain("ark-test-secret");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails without a completed Ark task and leaves no output clip", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-seedance-"));
    const photoPath = path.join(tempDir, "presenter.png");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      writeFileSync(audioPath, Buffer.from("audio"));

      await expect(
        generateSeedanceAvatar({
          arkApiKey: "ark-test-secret",
          arkBaseUrl: "https://ark.example.test/api/v3",
          arkModel: "doubao-seedance-test",
          audioPath,
          durationSeconds: 7.6,
          episodeId: "avatar-demo",
          outputPath,
          photoPath,
          prompt: "主播面向镜头。",
          request: async (_input, init) => {
            if (init?.method === "POST") {
              return jsonResponse({ id: "task-123", status: "queued" });
            }
            return jsonResponse({ error: { message: "moderation rejected" }, status: "failed" });
          },
          sceneId: "scene-01",
          sleep: async () => undefined,
          uploadAsset: async ({ kind }) => `https://tos.example.test/${kind}`,
        }),
      ).rejects.toThrow(/moderation rejected/);
      expect(existsSync(outputPath)).toBe(false);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("retries transient task polling failures without resubmitting a task", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-seedance-retry-"));
    const photoPath = path.join(tempDir, "presenter.png");
    const audioPath = path.join(tempDir, "scene.wav");
    const outputPath = path.join(tempDir, "scene.mp4");
    let createRequests = 0;
    let pollRequests = 0;

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      writeFileSync(audioPath, Buffer.from("audio"));

      await generateSeedanceAvatar({
        arkApiKey: "ark-test-secret",
        arkBaseUrl: "https://ark.example.test/api/v3",
        arkModel: "doubao-seedance-test",
        audioPath,
        durationSeconds: 7.6,
        episodeId: "avatar-demo",
        outputPath,
        photoPath,
        prompt: "主播面向镜头。",
        request: async (input, init) => {
          if (init?.method === "POST") {
            createRequests += 1;
            return jsonResponse({ id: "task-123", status: "queued" });
          }
          if (input.endsWith("/task-123")) {
            pollRequests += 1;
            if (pollRequests === 1) {
              throw new TypeError("socket reset");
            }
            return jsonResponse({
              content: { video_url: "https://video.example.test/result.mp4" },
              status: "succeeded",
            });
          }
          return new Response(Buffer.from("video"));
        },
        sceneId: "scene-01",
        sleep: async () => undefined,
        uploadAsset: async ({ kind }) => `https://tos.example.test/${kind}`,
      });

      expect(createRequests).toBe(1);
      expect(pollRequests).toBe(2);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("uses a scoped, signed TOS upload and returns only a temporary download URL", async () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-tos-"));
    const photoPath = path.join(tempDir, "presenter.png");
    let uploadedUrl = "";
    let authorization = "";

    try {
      writeFileSync(photoPath, Buffer.from("photo"));
      const upload = createTosSeedanceUploader({
        accessKeyId: "AK_TEST",
        accessKeySecret: "SK_TEST",
        bucket: "private-avatar-assets",
        endpoint: "tos-cn-beijing.volces.com",
        prefix: "ai-remotion/avatar-demo",
        region: "cn-beijing",
        request: async (url, init) => {
          uploadedUrl = url.toString();
          authorization = String(init.headers && new Headers(init.headers).get("Authorization"));
          return { ok: true, status: 200 };
        },
      });

      const signedUrl = await upload({ filePath: photoPath, kind: "image" });

      expect(uploadedUrl).toMatch(
        /^https:\/\/private-avatar-assets\.tos-cn-beijing\.volces\.com\/ai-remotion\/avatar-demo\/image\//,
      );
      expect(authorization).toContain("TOS4-HMAC-SHA256 Credential=AK_TEST/");
      expect(signedUrl).toContain("X-Tos-Expires=3600");
      expect(signedUrl).not.toContain("SK_TEST");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("normalizes Seedance clips to the scene duration without an audio stream", () => {
    expect(
      getSeedanceVideoNormalizationCommand({
        durationSeconds: 7.6,
        fps: 30,
        inputPath: "input.mp4",
        outputPath: "output.mp4",
      }),
    ).toEqual([
      "-y",
      "-i",
      "input.mp4",
      "-map",
      "0:v:0",
      "-an",
      "-vf",
      "fps=30",
      "-t",
      "7.600",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "output.mp4",
    ]);
  });
});

const jsonResponse = (payload: unknown): Response =>
  new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json" },
  });
