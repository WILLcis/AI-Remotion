import { describe, expect, it } from "vitest";
import sampleRenderPlanJson from "../episodes/sample/render-plan.json";
import { sampleRenderPlan } from "../src/remotion/templates/defaultRenderPlan";
import type { SceneType } from "../src/remotion/types";

const defaultSceneTypes = [
  "title",
  "key_point",
  "image_card",
  "list",
  "timeline",
  "comparison",
  "quote",
  "cta",
] satisfies SceneType[];

describe("default explainer template coverage", () => {
  it("keeps default Remotion props synced with the sample render plan", () => {
    expect(sampleRenderPlan).toEqual(sampleRenderPlanJson);
  });

  it("covers every default scene component in the sample render plan", () => {
    const renderedSceneTypes = new Set(
      sampleRenderPlan.scenes.map((scene) => scene.type),
    );

    for (const sceneType of defaultSceneTypes) {
      expect(renderedSceneTypes.has(sceneType)).toBe(true);
    }
  });
});
