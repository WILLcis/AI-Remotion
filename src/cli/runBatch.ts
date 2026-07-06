import {
  createBatchPlan,
  listEpisodeIds,
  parseBatchSteps,
  runBatchPlan,
  type BatchStep,
} from "../episodes/batchWorkflow";

type CliOptions = {
  all: boolean;
  dryRun: boolean;
  episodes: string[];
  help: boolean;
  qaRenderFrames: boolean;
  steps: BatchStep[];
  voiceProvider: "silent" | "macos-say";
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const episodeIds = options.all ? listEpisodeIds() : options.episodes;
  if (episodeIds.length === 0) {
    throw new Error("No episodes selected. Use --episodes <ids> or --all.");
  }

  const plan = createBatchPlan({
    episodeIds,
    qaRenderFrames: options.qaRenderFrames,
    steps: options.steps,
    voiceProvider: options.voiceProvider,
  });

  console.log(`Batch plan: ${plan.length} command(s)`);
  for (const item of plan) {
    console.log(
      `- ${item.label}: ${item.command.executable} ${item.command.args.join(" ")}`,
    );
  }

  if (options.dryRun) {
    return;
  }

  const result = await runBatchPlan(plan);
  console.log(`Batch complete: ${result.completed.length}/${plan.length}`);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    all: false,
    dryRun: false,
    episodes: [],
    help: false,
    qaRenderFrames: false,
    steps: ["validate"],
    voiceProvider: "silent",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--all") {
      options.all = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--qa-render-frames") {
      options.qaRenderFrames = true;
      continue;
    }

    if (arg === "--episodes") {
      options.episodes = parseEpisodeIds(requireValue(arg, next));
      index += 1;
      continue;
    }

    if (arg === "--steps") {
      options.steps = parseBatchSteps(requireValue(arg, next));
      index += 1;
      continue;
    }

    if (arg === "--voice-provider") {
      const value = requireValue(arg, next);
      if (value !== "silent" && value !== "macos-say") {
        throw new Error("--voice-provider must be silent or macos-say");
      }
      options.voiceProvider = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (options.all && options.episodes.length > 0) {
    throw new Error("Use either --all or --episodes, not both");
  }

  return options;
};

const parseEpisodeIds = (value: string): string[] => {
  return value
    .split(",")
    .map((episodeId) => episodeId.trim())
    .filter(Boolean);
};

const requireValue = (arg: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${arg} requires a value`);
  }

  return value;
};

const printHelp = (): void => {
  console.log(`Run local AI-Remotion workflow steps over one or more episodes.

Usage:
  npm run episode:batch -- --episodes sample --steps validate,qa --dry-run
  npm run episode:batch -- --episodes sample --steps validate,render,qa --qa-render-frames
  npm run episode:batch -- --all --steps validate
`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
