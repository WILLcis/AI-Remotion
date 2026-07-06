import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const batchSteps = [
  "script",
  "storyboard",
  "render-plan",
  "captions",
  "voice",
  "render",
  "qa",
  "validate",
] as const;

export type BatchStep = (typeof batchSteps)[number];

export type BatchCommand = {
  args: string[];
  executable: string;
};

export type BatchPlanItem = {
  command: BatchCommand;
  episodeId: string;
  label: string;
  step: BatchStep;
};

export type CreateBatchPlanOptions = {
  episodeIds: string[];
  qaRenderFrames?: boolean;
  steps: BatchStep[];
  voiceProvider?: "silent" | "macos-say";
};

export type RunBatchPlanResult = {
  completed: BatchPlanItem[];
};

export const createBatchPlan = ({
  episodeIds,
  qaRenderFrames = false,
  steps,
  voiceProvider = "silent",
}: CreateBatchPlanOptions): BatchPlanItem[] => {
  return episodeIds.flatMap((episodeId) =>
    steps.map((step) => ({
      command: commandForStep({
        episodeId,
        qaRenderFrames,
        step,
        voiceProvider,
      }),
      episodeId,
      label: `${episodeId}:${step}`,
      step,
    })),
  );
};

export const runBatchPlan = async (
  plan: BatchPlanItem[],
): Promise<RunBatchPlanResult> => {
  const completed: BatchPlanItem[] = [];

  for (const item of plan) {
    await execFileAsync(item.command.executable, item.command.args);
    completed.push(item);
  }

  return { completed };
};

export const listEpisodeIds = (episodesRoot = path.resolve("episodes")): string[] => {
  if (!existsSync(episodesRoot)) {
    return [];
  }

  return readdirSync(episodesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((episodeId) =>
      existsSync(path.join(episodesRoot, episodeId, "brief.yaml")),
    )
    .sort();
};

export const parseBatchSteps = (value: string): BatchStep[] => {
  const steps = value
    .split(",")
    .map((step) => step.trim())
    .filter(Boolean);
  const parsedSteps: BatchStep[] = [];

  if (steps.length === 0) {
    throw new Error("Provide at least one batch step");
  }

  for (const step of steps) {
    if (!isBatchStep(step)) {
      throw new Error(`Unknown batch step: ${step}`);
    }

    parsedSteps.push(step);
  }

  return parsedSteps;
};

const commandForStep = ({
  episodeId,
  qaRenderFrames,
  step,
  voiceProvider,
}: {
  episodeId: string;
  qaRenderFrames: boolean;
  step: BatchStep;
  voiceProvider: "silent" | "macos-say";
}): BatchCommand => {
  const baseArgs = ["run", stepToScript(step), "--", "--episode", episodeId];

  if (step === "voice") {
    return {
      args: [...baseArgs, "--provider", voiceProvider],
      executable: "npm",
    };
  }

  if (step === "qa" && qaRenderFrames) {
    return {
      args: [...baseArgs, "--render-frames"],
      executable: "npm",
    };
  }

  return {
    args: baseArgs,
    executable: "npm",
  };
};

const stepToScript = (step: BatchStep): string => {
  if (step === "script") {
    return "episode:script";
  }

  if (step === "storyboard") {
    return "episode:storyboard";
  }

  if (step === "render-plan") {
    return "episode:render-plan";
  }

  if (step === "captions") {
    return "episode:captions";
  }

  if (step === "voice") {
    return "episode:voice";
  }

  if (step === "render") {
    return "episode:render";
  }

  if (step === "qa") {
    return "episode:qa";
  }

  return "episode:validate";
};

const isBatchStep = (value: string): value is BatchStep => {
  return batchSteps.includes(value as BatchStep);
};
