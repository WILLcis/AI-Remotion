import type { CalculateMetadataFunction } from "remotion";
import { Composition } from "remotion";
import { getRenderDurationFrames } from "../render/duration";
import "./styles.css";
import { ExplainerVideo } from "./templates/ExplainerVideo";
import { sampleRenderPlan } from "./templates/defaultRenderPlan";
import type { RenderPlan } from "./types";

const calculateMetadata: CalculateMetadataFunction<RenderPlan> = ({
  props,
}) => {
  return {
    durationInFrames: getRenderDurationFrames({
      fps: props.video.fps,
      duration_frames: props.video.duration_frames,
      scenes: props.scenes,
    }),
    fps: props.video.fps,
    width: props.video.width,
    height: props.video.height,
    props,
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ExplainerVideo"
      component={ExplainerVideo}
      durationInFrames={sampleRenderPlan.video.duration_frames}
      fps={sampleRenderPlan.video.fps}
      width={sampleRenderPlan.video.width}
      height={sampleRenderPlan.video.height}
      defaultProps={sampleRenderPlan}
      calculateMetadata={calculateMetadata}
    />
  );
};
