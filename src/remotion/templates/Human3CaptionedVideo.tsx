import React from "react";
import {
  AbsoluteFill,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";

export type TimedCaption = {
  endFrame: number;
  startFrame: number;
  text: string;
};

export type Human3CaptionedVideoProps = {
  captions: TimedCaption[];
  durationInFrames: number;
  videoSource: string;
};

export const Human3CaptionedVideo: React.FC<Human3CaptionedVideoProps> = ({
  captions,
  videoSource,
}) => {
  const frame = useCurrentFrame();
  const caption = captions.find(
    (item) => frame >= item.startFrame && frame < item.endFrame,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#050b16" }}>
      <OffthreadVideo src={staticFile(videoSource)} />
      {caption ? (
        <div
          style={{
            alignItems: "center",
            backgroundColor: "rgba(4, 13, 30, 0.82)",
            border: "1px solid rgba(116, 194, 255, 0.62)",
            borderRadius: 18,
            bottom: 88,
            boxShadow: "0 10px 36px rgba(0, 0, 0, 0.45)",
            color: "#ffffff",
            display: "flex",
            fontFamily: "Arial, sans-serif",
            fontSize: 34,
            fontWeight: 700,
            justifyContent: "center",
            left: 48,
            letterSpacing: 0.5,
            lineHeight: 1.35,
            minHeight: 82,
            padding: "14px 26px",
            position: "absolute",
            right: 48,
            textAlign: "center",
          }}
        >
          {caption.text}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
