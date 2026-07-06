import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { generateQaReport, writeQaReport } from "../qa/report";
import { parseRenderPlanFile } from "../schemas";

const execFileAsync = promisify(execFile);

type CliOptions = {
  dir?: string;
  episode?: string;
  help: boolean;
  renderFrames: boolean;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const episodeDir = resolveEpisodeDir(options);

  if (options.renderFrames) {
    await renderQaFrames(episodeDir);
  }

  const report = generateQaReport({ episodeDir });
  const reportPath = writeQaReport(report);

  console.log(`Generated QA report: ${path.relative(process.cwd(), reportPath)}`);
  console.log(
    `- pass: ${report.summary.pass}, warn: ${report.summary.warn}, fail: ${report.summary.fail}`,
  );
};

const renderQaFrames = async (episodeDir: string): Promise<void> => {
  const renderPlanPath = path.join(episodeDir, "render-plan.json");
  const renderPlan = parseRenderPlanFile(renderPlanPath);
  const frameDir = path.join(episodeDir, "out", "qa-frames");
  const frames = [
    { frame: 0, name: "first.png" },
    {
      frame: Math.floor(renderPlan.video.duration_frames / 2),
      name: "middle.png",
    },
    {
      frame: Math.max(0, renderPlan.video.duration_frames - 1),
      name: "final.png",
    },
  ];

  mkdirSync(frameDir, { recursive: true });

  for (const frame of frames) {
    await execFileAsync("npx", [
      "remotion",
      "still",
      "src/remotion/index.ts",
      "ExplainerVideo",
      path.join(frameDir, frame.name),
      `--props=${renderPlanPath}`,
      `--frame=${frame.frame}`,
    ]);
  }
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    help: false,
    renderFrames: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--render-frames") {
      options.renderFrames = true;
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
  console.log(`Generate qa-report.md for an AI-Remotion episode.

Usage:
  npm run episode:qa -- --episode sample
  npm run episode:qa -- --episode sample --render-frames
  npm run episode:qa -- --dir episodes/sample
`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
