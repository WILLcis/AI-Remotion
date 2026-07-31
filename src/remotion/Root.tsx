import type { CalculateMetadataFunction } from "remotion";
import { Composition } from "remotion";
import { getRenderDurationFrames } from "../render/duration";
import "./styles.css";
import { ExplainerVideo } from "./templates/ExplainerVideo";
import { sampleRenderPlan } from "./templates/defaultRenderPlan";
import {
  Human3CaptionedVideo,
} from "./templates/Human3CaptionedVideo";
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
    <>
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
      <Composition
        id="Human3CaptionedVideo"
        component={Human3CaptionedVideo}
        durationInFrames={1}
        fps={25}
        width={720}
        height={1280}
        defaultProps={{
          captions: [],
          durationInFrames: 1,
          videoSource: "",
        }}
        calculateMetadata={({ props }) => ({
          durationInFrames: props.durationInFrames,
          fps: 25,
          height: 1280,
          props,
          width: 720,
        })}
      />
    </>
  );
};
