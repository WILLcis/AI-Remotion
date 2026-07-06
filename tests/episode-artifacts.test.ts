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

describe("episode artifact validation", () => {
  it("loads the sample brief, storyboard, and render plan", () => {
    const artifacts = loadEpisodeArtifacts(sampleEpisodeDir);

    expect(artifacts.brief.topic).toBe("普通人如何理解 Remotion");
    expect(artifacts.storyboard.scenes).toHaveLength(6);
    expect(artifacts.renderPlan.video.duration_frames).toBe(540);
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
