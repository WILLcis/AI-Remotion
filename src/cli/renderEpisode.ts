import path from "node:path";
import { renderEpisode } from "../render/episodeRender";

type CliOptions = {
  dir?: string;
  episode?: string;
  help: boolean;
  output?: string;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const episodeDir = resolveEpisodeDir(options);
  const result = await renderEpisode({
    episodeDir,
    outputPath: options.output,
  });

  console.log(`Rendered episode: ${path.relative(process.cwd(), result.outputPath)}`);
  console.log(`- command: ${result.command.executable} ${result.command.args.join(" ")}`);
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

    if (arg === "--output") {
      if (!next) {
        throw new Error("--output requires a value");
      }
      options.output = next;
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
  console.log(`Render an AI-Remotion episode from render-plan.json.

Usage:
  npm run episode:render -- --episode sample
  npm run episode:render -- --dir episodes/sample
  npm run episode:render -- --episode sample --output episodes/sample/out/custom.mp4
`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
