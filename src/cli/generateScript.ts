import { writeFileSync } from "node:fs";
import path from "node:path";
import { generateScriptFromBrief } from "../agent/workflows";
import { parseBriefFile } from "../schemas";

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
  const brief = parseBriefFile(path.join(episodeDir, "brief.yaml"));
  const scriptPath = path.join(episodeDir, "script.md");

  writeFileSync(scriptPath, `${generateScriptFromBrief(brief)}\n`);

  console.log(`Generated script: ${path.relative(process.cwd(), scriptPath)}`);
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
  console.log(`Generate a reviewable script from brief.yaml.

Usage:
  npm run episode:script -- --episode sample
  npm run episode:script -- --dir episodes/sample
`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
