import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateQaReport, renderQaReportMarkdown } from "../src/qa/report";

const sampleEpisodeDir = path.join(process.cwd(), "episodes", "sample");

describe("QA report", () => {
  it("checks rendered output, captions, frame stills, and known limitations", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-qa-"));

    try {
      cpSync(sampleEpisodeDir, tempDir, { recursive: true });
      mkdirSync(path.join(tempDir, "out", "qa-frames"), { recursive: true });
      writeFileSync(path.join(tempDir, "out", "final.mp4"), Buffer.alloc(4096, 1));
      writeFileSync(
        path.join(tempDir, "out", "qa-frames", "first.png"),
        Buffer.alloc(4096, 1),
      );
      writeFileSync(
        path.join(tempDir, "out", "qa-frames", "middle.png"),
        Buffer.alloc(4096, 1),
      );
      writeFileSync(
        path.join(tempDir, "out", "qa-frames", "final.png"),
        Buffer.alloc(4096, 1),
      );

      const report = generateQaReport({
        episodeDir: tempDir,
        mediaProbe: () => ({
          durationSeconds: 24,
          hasAudio: false,
          height: 1920,
          ok: true,
          width: 1080,
        }),
      });
      const markdown = renderQaReportMarkdown(report);

      expect(report.checks.find((check) => check.id === "video-file")?.status).toBe(
        "pass",
      );
      expect(report.checks.find((check) => check.id === "media-probe")?.status).toBe(
        "pass",
      );
      expect(report.checks.find((check) => check.id === "frame-stills")?.status).toBe(
        "pass",
      );
      expect(markdown).toContain("# QA Report");
      expect(markdown).toContain("Resolution: 1080x1920");
      expect(markdown).toContain("Known Limitations");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("warns when media probing is unavailable", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-qa-"));

    try {
      cpSync(sampleEpisodeDir, tempDir, { recursive: true });
      mkdirSync(path.join(tempDir, "out"), { recursive: true });
      writeFileSync(path.join(tempDir, "out", "final.mp4"), Buffer.alloc(4096, 1));

      const report = generateQaReport({
        episodeDir: tempDir,
        mediaProbe: () => ({
          ok: false,
          reason: "ffprobe is not installed",
          unavailable: true,
        }),
      });

      expect(report.checks.find((check) => check.id === "media-probe")?.status).toBe(
        "warn",
      );
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("fails avatar QA when consent is missing", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-avatar-qa-"));

    try {
      cpSync(sampleEpisodeDir, tempDir, { recursive: true });
      const planPath = path.join(tempDir, "render-plan.json");
      const plan = JSON.parse(readFileSync(planPath, "utf8")) as Record<string, unknown>;
      plan.avatar = {
        clips: [],
        enabled: true,
        layout: "pip",
      };
      writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);

      const report = generateQaReport({
        episodeDir: tempDir,
        mediaProbe: () => ({
          durationSeconds: 24,
          hasAudio: true,
          height: 1920,
          ok: true,
          width: 1080,
        }),
      });

      expect(report.checks.find((check) => check.id === "talking-avatar")?.status).toBe(
        "fail",
      );
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("audits Seedance clips against the manifest and scene timing", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-seedance-qa-"));

    try {
      cpSync(sampleEpisodeDir, tempDir, { recursive: true });
      const planPath = path.join(tempDir, "render-plan.json");
      const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
        avatar?: unknown;
        scenes: Array<{ duration_seconds: number; id: string }>;
      };
      plan.avatar = {
        audio_policy: "remotion_mux",
        clips: [{ path: "assets/avatar/scene-01.mp4", scene_id: "scene-01" }],
        enabled: true,
        manifest_path: "assets/avatar/manifest.json",
        provider: "seedance",
      };
      writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
      mkdirSync(path.join(tempDir, "assets", "avatar"), { recursive: true });
      writeFileSync(path.join(tempDir, "assets", "avatar", "scene-01.mp4"), "video");
      writeFileSync(
        path.join(tempDir, "assets", "avatar", "manifest.json"),
        JSON.stringify({ clips: [{ scene_id: "scene-01" }] }),
      );
      writeFileSync(
        path.join(tempDir, "rights.yaml"),
        [
          "voice:",
          "  subject: self",
          "  consent_confirmed: true",
          "  permitted_use: product_explainer",
          "  reference_audio: audio/reference.wav",
          "  reference_transcript: exact transcript",
          "portrait:",
          "  subject: self",
          "  consent_confirmed: true",
          "  permitted_use: product_explainer",
          "  source: assets/avatar.jpg",
          "cloud_processing:",
          "  provider: volcengine-ark",
          "  data_processing_consent: true",
          "  likeness_scope: full_body",
          "  tos_region: cn-beijing",
        ].join("\n"),
      );

      const report = generateQaReport({
        episodeDir: tempDir,
        mediaProbe: (filePath) =>
          filePath.includes("assets/avatar")
            ? {
                durationSeconds: plan.scenes[0].duration_seconds,
                hasAudio: false,
                height: 1920,
                ok: true,
                width: 1080,
              }
            : {
                durationSeconds: 24,
                hasAudio: true,
                height: 1920,
                ok: true,
                width: 1080,
              },
      });

      expect(report.checks.find((check) => check.id === "talking-avatar")).toMatchObject({
        status: "warn",
      });
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it.each(["infinitetalk", "longcat", "heygen"] as const)(
    "audits %s clips against their isolated manifest and scene timing",
    (provider) => {
    const tempDir = mkdtempSync(path.join(tmpdir(), `ai-remotion-${provider}-qa-`));

    try {
      cpSync(sampleEpisodeDir, tempDir, { recursive: true });
      const planPath = path.join(tempDir, "render-plan.json");
      const plan = JSON.parse(readFileSync(planPath, "utf8")) as {
        avatar?: unknown;
        scenes: Array<{ duration_seconds: number; id: string }>;
      };
      plan.avatar = {
        audio_policy: "remotion_mux",
        clips: [{ path: "assets/avatar/scene-01.mp4", scene_id: "scene-01" }],
        enabled: true,
        manifest_path: `assets/avatar/${provider}-manifest.json`,
        provider,
      };
      writeFileSync(planPath, `${JSON.stringify(plan, null, 2)}\n`);
      mkdirSync(path.join(tempDir, "assets", "avatar"), { recursive: true });
      writeFileSync(path.join(tempDir, "assets", "avatar", "scene-01.mp4"), "video");
      writeFileSync(
        path.join(tempDir, "assets", "avatar", `${provider}-manifest.json`),
        JSON.stringify({ scenes: [{ scene_id: "scene-01" }] }),
      );
      writeFileSync(
        path.join(tempDir, "rights.yaml"),
        [
          "voice:",
          "  subject: self",
          "  consent_confirmed: true",
          "  permitted_use: product_explainer",
          "  reference_audio: audio/reference.wav",
          "  reference_transcript: exact transcript",
          "portrait:",
          "  subject: self",
          "  consent_confirmed: true",
          "  permitted_use: product_explainer",
          "  source: assets/avatar.jpg",
          ...(provider === "heygen"
            ? [
                "cloud_processing:",
                "  provider: heygen",
                "  data_processing_consent: true",
                "  likeness_scope: head_only",
              ]
            : []),
        ].join("\n"),
      );

      const report = generateQaReport({
        episodeDir: tempDir,
        mediaProbe: (filePath) =>
          filePath.includes("assets/avatar")
            ? {
                durationSeconds: plan.scenes[0].duration_seconds,
                hasAudio: false,
                height: 1920,
                ok: true,
                width: 1080,
              }
            : {
                durationSeconds: 24,
                hasAudio: true,
                height: 1920,
                ok: true,
                width: 1080,
              },
      });

      expect(report.checks.find((check) => check.id === "talking-avatar")).toMatchObject({
        status: "warn",
      });
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
    },
  );
});
