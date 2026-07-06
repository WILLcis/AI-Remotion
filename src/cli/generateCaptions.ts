import { writeFileSync } from "node:fs";
import path from "node:path";
import { captionsFromRenderPlan, renderSrt } from "../captions";
import { parseRenderPlanFile } from "../schemas";

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
  const renderPlanPath = path.join(episodeDir, "render-plan.json");
  const renderPlan = parseRenderPlanFile(renderPlanPath);
  const captions = captionsFromRenderPlan(renderPlan);
  const updatedRenderPlan = {
    ...renderPlan,
    captions: {
      enabled: true,
      items: captions,
    },
  };

  writeFileSync(
    renderPlanPath,
    `${JSON.stringify(updatedRenderPlan, null, 2)}\n`,
  );
  writeFileSync(
    path.join(episodeDir, "captions.srt"),
    renderSrt(captions, renderPlan.video.fps),
  );

  console.log(`Generated captions: ${path.relative(process.cwd(), episodeDir)}`);
  console.log(`- captions: ${captions.length}`);
  console.log(`- srt: ${path.relative(process.cwd(), path.join(episodeDir, "captions.srt"))}`);
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
  console.log(`Generate frame-aligned captions for an AI-Remotion episode.

Usage:
  npm run episode:captions -- --episode sample
  npm run episode:captions -- --dir episodes/sample
`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
