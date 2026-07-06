export type SceneDurationInput = {
  duration_seconds: number;
};

export type RenderDurationInput = {
  fps: number;
  duration_frames?: number;
  scenes: SceneDurationInput[];
};

export const secondsToFrames = (seconds: number, fps: number): number => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(`Invalid duration in seconds: ${seconds}`);
  }

  if (!Number.isInteger(fps) || fps <= 0) {
    throw new Error(`Invalid fps: ${fps}`);
  }

  return Math.round(seconds * fps);
};

export const sumSceneFrames = (
  scenes: SceneDurationInput[],
  fps: number,
): number => {
  return scenes.reduce((total, scene) => {
    return total + secondsToFrames(scene.duration_seconds, fps);
  }, 0);
};

export const getRenderDurationFrames = ({
  fps,
  duration_frames,
  scenes,
}: RenderDurationInput): number => {
  if (duration_frames !== undefined) {
    if (!Number.isInteger(duration_frames) || duration_frames <= 0) {
      throw new Error(`Invalid explicit duration in frames: ${duration_frames}`);
    }

    return duration_frames;
  }

  return sumSceneFrames(scenes, fps);
};
