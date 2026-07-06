import { describe, expect, it } from "vitest";
import {
  getRenderDurationFrames,
  secondsToFrames,
  sumSceneFrames,
} from "../src/render/duration";

describe("render duration helpers", () => {
  it("rounds scene seconds to whole frames", () => {
    expect(secondsToFrames(1.25, 30)).toBe(38);
  });

  it("sums scene durations in frames", () => {
    expect(
      sumSceneFrames(
        [
          { duration_seconds: 1.5 },
          { duration_seconds: 2 },
          { duration_seconds: 0.5 },
        ],
        30,
      ),
    ).toBe(120);
  });

  it("prefers explicit video duration over scene duration", () => {
    expect(
      getRenderDurationFrames({
        fps: 30,
        duration_frames: 300,
        scenes: [{ duration_seconds: 60 }],
      }),
    ).toBe(300);
  });
});
