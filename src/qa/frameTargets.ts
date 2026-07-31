export type QaFrameTarget = {
  frame: number;
  name: "first.png" | "middle.png" | "final.png";
};

type SceneTiming = {
  duration_frames: number;
  start_frame: number;
};

export const getQaFrameTargets = ({
  durationFrames,
  scenes,
}: {
  durationFrames: number;
  scenes: SceneTiming[];
}): QaFrameTarget[] => {
  const finalFrame = Math.max(0, durationFrames - 1);

  return [
    {
      frame: getSceneCenter(scenes[0], 0, finalFrame),
      name: "first.png",
    },
    {
      frame: getSceneCenter(
        scenes.find(
          (scene) =>
            scene.start_frame <= Math.floor(durationFrames / 2) &&
            scene.start_frame + scene.duration_frames > Math.floor(durationFrames / 2),
        ),
        Math.floor(durationFrames / 2),
        finalFrame,
      ),
      name: "middle.png",
    },
    {
      frame: getSceneCenter(scenes.at(-1), finalFrame, finalFrame),
      name: "final.png",
    },
  ];
};

const getSceneCenter = (
  scene: SceneTiming | undefined,
  fallback: number,
  finalFrame: number,
): number => {
  if (!scene || scene.duration_frames <= 0) {
    return fallback;
  }

  return Math.min(
    finalFrame,
    scene.start_frame + Math.floor(scene.duration_frames / 2),
  );
};
