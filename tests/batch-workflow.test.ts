import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createBatchPlan,
  listEpisodeIds,
  parseBatchSteps,
} from "../src/episodes/batchWorkflow";

describe("batch workflow", () => {
  it("creates deterministic npm commands for selected episodes and steps", () => {
    const plan = createBatchPlan({
      episodeIds: ["alpha", "beta"],
      qaRenderFrames: true,
      steps: ["validate", "render", "qa"],
    });

    expect(plan.map((item) => item.label)).toEqual([
      "alpha:validate",
      "alpha:render",
      "alpha:qa",
      "beta:validate",
      "beta:render",
      "beta:qa",
    ]);
    expect(plan[0].command).toEqual({
      args: ["run", "episode:validate", "--", "--episode", "alpha"],
      executable: "npm",
    });
    expect(plan[2].command.args).toEqual([
      "run",
      "episode:qa",
      "--",
      "--episode",
      "alpha",
      "--render-frames",
    ]);
  });

  it("lists only episode folders that contain a brief", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-batch-"));

    try {
      mkdirSync(path.join(tempDir, "beta"));
      mkdirSync(path.join(tempDir, "alpha"));
      mkdirSync(path.join(tempDir, "not-episode"));
      writeFileSync(path.join(tempDir, "beta", "brief.yaml"), "topic: beta");
      writeFileSync(path.join(tempDir, "alpha", "brief.yaml"), "topic: alpha");

      expect(listEpisodeIds(tempDir)).toEqual(["alpha", "beta"]);
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("parses batch step lists and rejects unknown steps", () => {
    expect(parseBatchSteps("script,storyboard,render-plan")).toEqual([
      "script",
      "storyboard",
      "render-plan",
    ]);
    expect(() => parseBatchSteps("script,unknown")).toThrow(/Unknown batch step/);
  });
});
