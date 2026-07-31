import { writeFileSync } from "node:fs";
import path from "node:path";
import { generateScriptWithProvider } from "../agent/providers/llm";
import { generateScriptFromBrief } from "../agent/workflows";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import { parseBriefFile } from "../schemas";

type CliOptions = {
  dir?: string;
  episode?: string;
  help: boolean;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const episodeDir = resolveEpisodeDir(options);
  const brief = parseBriefFile(path.join(episodeDir, "brief.yaml"));
  const scriptPath = path.join(episodeDir, "script.md");
  const generatedScript = await generateScriptWithProvider({
    config: loadRuntimeConfig().llm,
    deterministicScript: () => generateScriptFromBrief(brief),
    messages: [
      {
        content:
          "You write reviewable explainer-video scripts. Return Markdown only: one '# title' line followed by at least six '## Segment N' sections. Every section must contain Spoken:, Visual:, and Duration: fields. Do not state uncertain factual claims as verified facts.",
        role: "system",
      },
      {
        content: `Create a Chinese explainer-video script from this brief:\n${JSON.stringify(
          brief,
          null,
          2,
        )}`,
        role: "user",
      },
    ],
  });

  writeFileSync(scriptPath, `${generatedScript.text}\n`);

  console.log(`Generated script: ${path.relative(process.cwd(), scriptPath)}`);
  console.log(`- llm: ${generatedScript.provider} (${generatedScript.reason})`);
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
