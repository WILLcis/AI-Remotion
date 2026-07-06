import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  captionsFromRenderPlan,
  formatSrtTimestamp,
  renderSrt,
  wrapCaptionText,
} from "../src/captions";
import { loadEpisodeArtifacts } from "../src/schemas";

const sampleEpisodeDir = path.join(process.cwd(), "episodes", "sample");

describe("caption generation", () => {
  it("converts render-plan scene captions into frame-aligned captions", () => {
    const { renderPlan } = loadEpisodeArtifacts(sampleEpisodeDir);
    const captions = captionsFromRenderPlan(renderPlan);

    expect(captions).toHaveLength(8);
    expect(captions[0]).toEqual({
      start_frame: 0,
      end_frame: 90,
      text: "Remotion 不是剪辑软件，而是用 React 生成视频。",
    });
  });

  it("renders SRT timestamps from frame ranges", () => {
    expect(formatSrtTimestamp(90, 30)).toBe("00:00:03,000");
    expect(formatSrtTimestamp(95, 30)).toBe("00:00:03,167");
  });

  it("adds readable semantic line breaks for long Chinese captions", () => {
    const wrapped = wrapCaptionText(
      "图文讲解可以把截图、概念卡和流程图放进同一套版式。",
      18,
    );

    expect(wrapped).toContain("\n");
    expect(wrapped.split("\n").every((line) => line.length > 2)).toBe(true);
  });

  it("exports captions as SRT", () => {
    const { renderPlan } = loadEpisodeArtifacts(sampleEpisodeDir);
    const srt = renderSrt(captionsFromRenderPlan(renderPlan), renderPlan.video.fps);

    expect(srt).toContain("1\n00:00:00,000 --> 00:00:03,000");
    expect(srt).toContain("8\n00:00:21,000 --> 00:00:24,000");
  });
});
