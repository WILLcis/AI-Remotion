import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadEpisodeArtifacts,
  parseBriefFile,
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
});
