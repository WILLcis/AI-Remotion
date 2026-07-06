import { describe, expect, it } from "vitest";
import { renderPlanSchema, type Brief } from "../src/schemas";
import {
  generateRenderPlanFromStoryboard,
  generateScriptFromBrief,
  generateStoryboardFromScript,
  routeRevisionRequest,
} from "../src/agent/workflows";

const brief: Brief = {
  aspect_ratio: "9:16",
  audience: "想了解产品的创作者",
  duration_seconds: 24,
  must_avoid: [],
  must_include: ["结构化文件", "可复用模板"],
  platform: "抖音",
  source_notes: [],
  tone: "清楚直接",
  topic: "用 AI-Remotion 做产品讲解",
  visual_style: "深色信息卡片",
  voice: "自然中文旁白",
};

describe("agent workflow", () => {
  it("generates a reviewable scene-by-scene script from a brief", () => {
    const script = generateScriptFromBrief(brief);

    expect(script).toContain("# 用 AI-Remotion 做产品讲解");
    expect(script).toContain("## Segment 1");
    expect(script).toContain("Spoken:");
    expect(script).toContain("Visual:");
    expect(script).toContain("Duration:");
  });

  it("converts generated script into storyboard JSON", () => {
    const storyboard = generateStoryboardFromScript({
      episodeId: "workflow-test",
      script: generateScriptFromBrief(brief),
    });

    expect(storyboard.episode_id).toBe("workflow-test");
    expect(storyboard.scenes.length).toBeGreaterThanOrEqual(6);
    expect(storyboard.scenes[0]).toMatchObject({
      visual_type: "title",
    });
  });

  it("converts storyboard into a schema-valid render plan", () => {
    const storyboard = generateStoryboardFromScript({
      episodeId: "workflow-test",
      script: generateScriptFromBrief(brief),
    });
    const renderPlan = generateRenderPlanFromStoryboard({
      brief,
      episodeId: "workflow-test",
      storyboard,
    });

    expect(renderPlanSchema.safeParse(renderPlan).success).toBe(true);
    expect(renderPlan.video.duration_frames).toBe(720);
    expect(renderPlan.scenes[1].start_frame).toBe(90);
  });

  it("routes natural-language revisions to the smallest artifact set", () => {
    expect(routeRevisionRequest("换成更沉稳的男声").changeType).toBe("voice");
    expect(routeRevisionRequest("第 4 段不要卡片，改成时间轴").changeType).toBe(
      "visual",
    );
    expect(routeRevisionRequest("第 3 段太长，压缩到一句话").artifacts).toContain(
      "script.md",
    );
  });
});
