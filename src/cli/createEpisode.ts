import path from "node:path";
import {
  createEpisodeSkeleton,
  type CreateEpisodeSkeletonOptions,
} from "../episodes/createEpisode";

type CliOptions = CreateEpisodeSkeletonOptions & {
  help: boolean;
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const result = createEpisodeSkeleton(options);

  console.log(`Created episode: ${path.relative(process.cwd(), result.episodeDir)}`);
  console.log(`- brief: ${path.relative(process.cwd(), result.briefPath)}`);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: Partial<CliOptions> = {
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--id") {
      options.id = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--topic") {
      options.topic = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--audience") {
      options.audience = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--platform") {
      options.platform = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--duration") {
      options.durationSeconds = Number(requireValue(arg, next));
      index += 1;
      continue;
    }

    if (arg === "--aspect-ratio") {
      const value = requireValue(arg, next);
      if (value !== "9:16" && value !== "16:9") {
        throw new Error("--aspect-ratio must be 9:16 or 16:9");
      }
      options.aspectRatio = value;
      index += 1;
      continue;
    }

    if (arg === "--tone") {
      options.tone = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--voice") {
      options.voice = requireValue(arg, next);
      index += 1;
      continue;
    }

    if (arg === "--visual-style") {
      options.visualStyle = requireValue(arg, next);
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.id) {
    throw new Error("Provide --id <episode-id>");
  }

  if (
    options.durationSeconds !== undefined &&
    (!Number.isFinite(options.durationSeconds) || options.durationSeconds <= 0)
  ) {
    throw new Error("--duration must be a positive number");
  }

  return options as CliOptions;
};

const requireValue = (arg: string, value: string | undefined): string => {
  if (!value) {
    throw new Error(`${arg} requires a value`);
  }

  return value;
};

const printHelp = (): void => {
  console.log(`Create a new AI-Remotion episode folder with a valid brief.

Usage:
  npm run episode:new -- --id remotion-intro
  npm run episode:new -- --id product-demo --topic "用 AI-Remotion 生成产品讲解视频"
`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
