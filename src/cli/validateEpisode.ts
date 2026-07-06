import path from "node:path";
import { validateEpisodeArtifacts } from "../schemas";

type CliOptions = {
  dir?: string;
  episode?: string;
  help: boolean;
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const episodeDir = resolveEpisodeDir(options);
  const result = validateEpisodeArtifacts(episodeDir);

  if (!result.ok) {
    console.error(`Episode artifact validation failed: ${episodeDir}`);
    for (const issue of result.issues) {
      console.error(
        `- ${issue.artifact} ${path.relative(process.cwd(), issue.file)} ${issue.path}: ${issue.message}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Episode artifacts valid: ${path.relative(process.cwd(), episodeDir)}`);
  console.log(`- brief topic: ${result.artifacts.brief.topic}`);
  console.log(`- storyboard scenes: ${result.artifacts.storyboard.scenes.length}`);
  console.log(`- render frames: ${result.artifacts.renderPlan.video.duration_frames}`);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--episode") {
      if (!next) {
        throw new Error("--episode requires a value");
      }
      options.episode = next;
      index += 1;
      continue;
    }

    if (arg === "--dir") {
      if (!next) {
        throw new Error("--dir requires a value");
      }
      options.dir = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const resolveEpisodeDir = ({ dir, episode }: CliOptions): string => {
  if (dir && episode) {
    throw new Error("Use either --dir or --episode, not both");
  }

  if (dir) {
    return path.resolve(dir);
  }

  if (episode) {
    return path.resolve("episodes", episode);
  }

  throw new Error("Provide --episode <id> or --dir <path>");
};

const printHelp = (): void => {
  console.log(`Validate an AI-Remotion episode artifact set.

Usage:
  npm run episode:validate -- --episode sample
  npm run episode:validate -- --dir episodes/sample
`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
