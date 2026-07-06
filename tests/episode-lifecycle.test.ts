import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";
import { createEpisodeSkeleton } from "../src/episodes/createEpisode";
import {
  findMissingLocalAssets,
  getEpisodeRenderCommand,
  resolveEpisodeOutputPath,
} from "../src/render/episodeRender";
import { briefSchema, type RenderPlan } from "../src/schemas";

describe("episode lifecycle", () => {
  it("creates a new episode skeleton with a schema-valid brief", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-new-"));

    try {
      const result = createEpisodeSkeleton({
        episodesRoot: tempDir,
        id: "product-demo",
        topic: "用 AI-Remotion 生成产品讲解视频",
      });
      const briefPath = path.join(result.episodeDir, "brief.yaml");
      const brief = YAML.parse(readFileSync(briefPath, "utf8"));

      expect(result.episodeDir).toBe(path.join(tempDir, "product-demo"));
      expect(briefSchema.safeParse(brief).success).toBe(true);
      expect(brief.topic).toBe("用 AI-Remotion 生成产品讲解视频");
      expect(existsSync(path.join(result.episodeDir, "assets", ".gitkeep"))).toBe(
        true,
      );
      expect(existsSync(path.join(result.episodeDir, "audio", ".gitkeep"))).toBe(
        true,
      );
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("rejects unsafe or already existing episode ids", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-new-"));

    try {
      expect(() =>
        createEpisodeSkeleton({
          episodesRoot: tempDir,
          id: "../escape",
          topic: "bad",
        }),
      ).toThrow(/safe episode id/);

      createEpisodeSkeleton({
        episodesRoot: tempDir,
        id: "existing",
        topic: "existing",
      });

      expect(() =>
        createEpisodeSkeleton({
          episodesRoot: tempDir,
          id: "existing",
          topic: "existing again",
        }),
      ).toThrow(/already exists/);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("builds deterministic Remotion render command arguments", () => {
    const episodeDir = path.join(process.cwd(), "episodes", "sample");
    const outputPath = resolveEpisodeOutputPath({ episodeDir });
    const command = getEpisodeRenderCommand({
      outputPath,
      renderPlanPath: path.join(episodeDir, "render-plan.json"),
    });

    expect(outputPath).toBe(path.join(episodeDir, "out", "final.mp4"));
    expect(command.executable).toBe("npx");
    expect(command.args).toEqual([
      "remotion",
      "render",
      "src/remotion/index.ts",
      "ExplainerVideo",
      path.join(episodeDir, "out", "final.mp4"),
      `--props=${path.join(episodeDir, "render-plan.json")}`,
    ]);
  });

  it("detects missing local render assets before rendering", () => {
    const renderPlan: Pick<RenderPlan, "scenes"> = {
      scenes: [
        {
          caption: "caption",
          duration_frames: 30,
          duration_seconds: 1,
          id: "scene-01",
          narration: "narration",
          start_frame: 0,
          title: "title",
          type: "image_card",
          visual: {
            assets: ["assets/missing.png", "built-in concept card"],
          },
        },
      ],
    };

    expect(
      findMissingLocalAssets({
        episodeDir: path.join(process.cwd(), "episodes", "sample"),
        scenes: renderPlan.scenes,
      }),
    ).toEqual(["assets/missing.png"]);
  });
});
