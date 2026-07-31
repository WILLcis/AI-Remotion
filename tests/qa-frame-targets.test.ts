import { describe, expect, it } from "vitest";
import { getQaFrameTargets } from "../src/qa/frameTargets";

describe("QA frame targets", () => {
  it("captures the interior of the first and middle scenes", () => {
    expect(
      getQaFrameTargets({
        durationFrames: 720,
        scenes: [
          { duration_frames: 90, start_frame: 0 },
          { duration_frames: 90, start_frame: 90 },
          { duration_frames: 90, start_frame: 180 },
          { duration_frames: 90, start_frame: 270 },
          { duration_frames: 90, start_frame: 360 },
          { duration_frames: 90, start_frame: 450 },
          { duration_frames: 90, start_frame: 540 },
          { duration_frames: 90, start_frame: 630 },
        ],
      }),
    ).toEqual([
      { frame: 45, name: "first.png" },
      { frame: 405, name: "middle.png" },
      { frame: 675, name: "final.png" },
    ]);
  });

  it("falls back to timeline positions when scenes are unavailable", () => {
    expect(getQaFrameTargets({ durationFrames: 3, scenes: [] })).toEqual([
      { frame: 0, name: "first.png" },
      { frame: 1, name: "middle.png" },
      { frame: 2, name: "final.png" },
    ]);
  });
});
