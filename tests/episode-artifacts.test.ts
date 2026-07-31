import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadEpisodeArtifacts,
  parseBriefFile,
  parseRightsFile,
  validateEpisodeArtifacts,
} from "../src/schemas/episodeArtifacts";

const sampleEpisodeDir = path.join(process.cwd(), "episodes", "sample");
const canonicalDemoTopic =
  "普通人如何理解 Remotion，以及 AI-Remotion 如何生成图文讲解视频";

describe("episode artifact validation", () => {
  it("loads the sample brief, storyboard, and render plan", () => {
    const artifacts = loadEpisodeArtifacts(sampleEpisodeDir);

    expect(artifacts.brief.topic).toBe(canonicalDemoTopic);
    expect(artifacts.storyboard.scenes).toHaveLength(8);
    expect(artifacts.renderPlan.video.duration_frames).toBe(720);
  });

  it("keeps the sample episode positioned as the canonical public demo", () => {
    const artifacts = loadEpisodeArtifacts(sampleEpisodeDir);

    expect(artifacts.brief.topic).toBe(canonicalDemoTopic);
    expect(artifacts.brief.must_include).toContain(
      "AI-Remotion 使用结构化文件驱动 Remotion 渲染",
    );
    expect(artifacts.renderPlan.metadata.title).toBe(artifacts.brief.topic);
    expect(artifacts.renderPlan.metadata.subtitle).toContain("CLI-first");
    expect(artifacts.renderPlan.scenes.at(-1)?.visual.primary).toBe(
      "brief -> script -> storyboard -> render plan -> local MP4",
    );
  });

  it("validates the sample episode artifact set", () => {
    const result = validateEpisodeArtifacts(sampleEpisodeDir);

    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("reports missing required brief fields with a field path", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-brief-"));
    const invalidBrief = path.join(tempDir, "brief.yaml");

    writeFileSync(
      invalidBrief,
      [
        'audience: "creators"',
        'platform: "douyin"',
        "duration_seconds: 60",
        'aspect_ratio: "9:16"',
        'tone: "clear"',
        'voice: "neutral"',
        'visual_style: "cards"',
      ].join("\n"),
    );

    try {
      expect(() => parseBriefFile(invalidBrief)).toThrow(/topic/);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("accepts only explicit self-consent in rights files", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-rights-"));
    const rightsPath = path.join(tempDir, "rights.yaml");

    try {
      writeFileSync(
        rightsPath,
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
        ].join("\n"),
      );

      expect(parseRightsFile(rightsPath).voice.subject).toBe("self");
      writeFileSync(rightsPath, readFileSync(rightsPath, "utf8").replace("true", "false"));
      expect(() => parseRightsFile(rightsPath)).toThrow(/true/);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("accepts explicit Ark cloud processing consent for a full-body presenter", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-cloud-rights-"));
    const rightsPath = path.join(tempDir, "rights.yaml");

    try {
      writeFileSync(
        rightsPath,
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

      expect(parseRightsFile(rightsPath).cloud_processing?.likeness_scope).toBe(
        "full_body",
      );
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
