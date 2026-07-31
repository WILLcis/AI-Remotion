export type SceneTiming = {
  durationFrames: number;
  durationSeconds: number;
  startFrame: number;
};

export const getSceneTimings = ({
  durationsSeconds,
  fps,
}: {
  durationsSeconds: number[];
  fps: number;
}): SceneTiming[] => {
  if (fps <= 0 || !Number.isInteger(fps)) {
    throw new Error("fps must be a positive integer.");
  }

  if (
    durationsSeconds.length === 0 ||
    durationsSeconds.some((duration) => !Number.isFinite(duration) || duration <= 0)
  ) {
    throw new Error("Scene audio durations must be positive finite values.");
  }

  const exactFrames = durationsSeconds.map((duration) => duration * fps);
  const targetFrames = Math.round(
    exactFrames.reduce((total, duration) => total + duration, 0),
  );
  const frames = exactFrames.map((duration) => Math.max(1, Math.floor(duration)));
  let remainingFrames = targetFrames - frames.reduce((total, frame) => total + frame, 0);
  const priority = exactFrames
    .map((duration, index) => ({ index, remainder: duration - Math.floor(duration) }))
    .sort((left, right) => right.remainder - left.remainder);

  for (const item of priority) {
    if (remainingFrames === 0) {
      break;
    }

    frames[item.index] += 1;
    remainingFrames -= 1;
  }

  let startFrame = 0;
  return frames.map((durationFrames, index) => {
    const timing = {
      durationFrames,
      durationSeconds: durationsSeconds[index],
      startFrame,
    };
    startFrame += durationFrames;
    return timing;
  });
};
export const getSceneFrameDurations = ({
  fps,
  sceneDurationsSeconds,
}: {
  fps: number;
  sceneDurationsSeconds: number[];
}): number[] => {
  if (fps <= 0 || sceneDurationsSeconds.some((duration) => duration <= 0)) {
    throw new Error("Scene durations and FPS must be greater than 0.");
  }

  const exactFrames = sceneDurationsSeconds.map((duration) => duration * fps);
  const frameDurations = exactFrames.map((duration) => Math.max(1, Math.floor(duration)));
  const targetFrameCount = Math.max(
    sceneDurationsSeconds.length,
    Math.round(exactFrames.reduce((total, duration) => total + duration, 0)),
  );
  const remainingFrames = targetFrameCount - frameDurations.reduce((total, duration) => total + duration, 0);

  return exactFrames
    .map((duration, index) => ({
      fraction: duration - Math.floor(duration),
      index,
    }))
    .sort((left, right) => right.fraction - left.fraction)
    .reduce((durations, { index }, allocationIndex) => {
      if (allocationIndex < remainingFrames) {
        durations[index] += 1;
      }
      return durations;
    }, frameDurations);
};
