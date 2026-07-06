import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  generateVoiceover,
  type VoiceoverProvider,
} from "../audio/voiceover";
import { resolveConfiguredVoiceoverProvider } from "../audio/voiceoverConfig";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import { parseRenderPlanFile } from "../schemas";

type CliOptions = {
  dir?: string;
  episode?: string;
  help: boolean;
  provider?: VoiceoverProvider;
  voice?: string;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const episodeDir = resolveEpisodeDir(options);
  const renderPlanPath = path.join(episodeDir, "render-plan.json");
  const renderPlan = parseRenderPlanFile(renderPlanPath);
  const runtimeConfig = loadRuntimeConfig();
  const provider = resolveConfiguredVoiceoverProvider(
    options.provider,
    runtimeConfig.tts.provider,
  );
  const outputPath = path.join(episodeDir, "audio", "voiceover.wav");
  const text = renderPlan.scenes.map((scene) => scene.narration).join("\n\n");
  const plannedDurationSeconds =
    renderPlan.video.duration_frames / renderPlan.video.fps;
  const result = await generateVoiceover({
    durationSeconds: plannedDurationSeconds,
    outputPath,
    provider,
    text,
    voice: options.voice ?? runtimeConfig.tts.voice,
  });
  const updatedRenderPlan = {
    ...renderPlan,
    audio: {
      duration_seconds: result.durationSeconds,
      voiceover_path: toPosixPath(path.relative(episodeDir, result.outputPath)),
    },
  };

  writeFileSync(
    renderPlanPath,
    `${JSON.stringify(updatedRenderPlan, null, 2)}\n`,
  );

  console.log(`Generated voiceover: ${path.relative(process.cwd(), result.outputPath)}`);
  console.log(`- provider: ${result.provider}`);
  console.log(`- duration: ${result.durationSeconds.toFixed(3)}s`);
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

    if (arg === "--provider") {
      if (next !== "silent" && next !== "macos-say") {
        throw new Error("--provider must be silent or macos-say");
      }
      options.provider = next;
      index += 1;
      continue;
    }

    if (arg === "--voice") {
      if (!next) {
        throw new Error("--voice requires a value");
      }
      options.voice = next;
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

const toPosixPath = (filePath: string): string => {
  return filePath.split(path.sep).join("/");
};

const printHelp = (): void => {
  console.log(`Generate a voiceover for an AI-Remotion episode.

Usage:
  npm run episode:voice -- --episode sample --provider silent
  npm run episode:voice -- --episode sample --provider macos-say
  npm run episode:voice -- --dir episodes/sample --provider macos-say --voice Ting-Ting
`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
