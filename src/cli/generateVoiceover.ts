import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateSceneAlignedCosyVoiceClone } from "../audio/cosyVoiceClone";
import {
  generateSceneAlignedCosyVoiceover,
  generateVoiceover,
  type VoiceoverProvider,
} from "../audio/voiceover";
import { getSceneTimings } from "../audio/sceneTiming";
import { resolveConfiguredVoiceoverProvider } from "../audio/voiceoverConfig";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import { FLAGS, flags } from "../../flags/feature-flags";
import { parseRenderPlanFile, parseRightsFile } from "../schemas";

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
  const voiceoverOptions = {
    baseUrl: runtimeConfig.tts.baseUrl,
    durationSeconds: plannedDurationSeconds,
    outputPath,
    provider,
    timeoutMs: runtimeConfig.tts.requestTimeoutMs,
    voice: options.voice ?? runtimeConfig.tts.voice,
  };
  const sceneTexts = renderPlan.scenes.map((scene) => scene.narration);
  const cloneResult =
    provider === "cosyvoice-clone"
      ? await generateCloneVoiceover({
          episodeDir,
          outputPath,
          sceneTexts,
          targetSceneDurationsSeconds: renderPlan.scenes.map(
            (scene) => scene.duration_seconds,
          ),
          timeoutMs: runtimeConfig.tts.requestTimeoutMs,
          baseUrl: runtimeConfig.tts.baseUrl,
        })
      : undefined;
  const alignedResult =
    provider === "cosyvoice"
      ? await generateSceneAlignedCosyVoiceover({
          ...voiceoverOptions,
          sceneTexts,
        })
      : undefined;
  const result =
    cloneResult ??
    alignedResult ??
    (await generateVoiceover({
      ...voiceoverOptions,
      text,
    }));
  const sceneAlignedResult = cloneResult ?? alignedResult;
  const timings = sceneAlignedResult
    ? getSceneTimings({
        durationsSeconds: sceneAlignedResult.sceneDurationsSeconds,
        fps: renderPlan.video.fps,
      })
    : undefined;
  const scenes = renderPlan.scenes.map((scene, index) => {
    const timing = timings?.[index];
    return timing
      ? {
          ...scene,
          duration_frames: timing.durationFrames,
          duration_seconds: timing.durationSeconds,
          start_frame: timing.startFrame,
        }
      : scene;
  });
  const durationFrames =
    timings?.reduce((total, timing) => total + timing.durationFrames, 0) ??
    renderPlan.video.duration_frames;
  const updatedRenderPlan = {
    ...renderPlan,
    captions: {
      ...renderPlan.captions,
      items: scenes.map((scene) => ({
        end_frame: scene.start_frame + scene.duration_frames,
        start_frame: scene.start_frame,
        text: scene.caption,
      })),
    },
    audio: {
      duration_seconds: result.durationSeconds,
      provider,
      ...(timings ? { segments_path: "audio/segments.json" } : {}),
      voiceover_path: toPosixPath(path.relative(episodeDir, result.outputPath)),
    },
    metadata: {
      ...renderPlan.metadata,
      duration_seconds: durationFrames / renderPlan.video.fps,
    },
    scenes,
    video: {
      ...renderPlan.video,
      duration_frames: durationFrames,
    },
  };

  writeFileSync(
    renderPlanPath,
    `${JSON.stringify(updatedRenderPlan, null, 2)}\n`,
  );
  if (timings) {
    writeFileSync(
      path.join(episodeDir, "audio", "segments.json"),
      `${JSON.stringify(
        {
          provider,
          segments: renderPlan.scenes.map((scene, index) => ({
            duration_seconds: timings[index].durationSeconds,
            id: scene.id,
            ...(cloneResult
              ? {
                  path: toPosixPath(
                    path.relative(episodeDir, cloneResult.segmentPaths[index]),
                  ),
                }
              : {}),
            start_frame: timings[index].startFrame,
          })),
        },
        null,
        2,
      )}\n`,
    );
  }

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
    if (
      next !== "silent" &&
      next !== "macos-say" &&
      next !== "cosyvoice" &&
      next !== "cosyvoice-clone"
    ) {
      throw new Error(
        "--provider must be silent, macos-say, cosyvoice, or cosyvoice-clone",
      );
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
  npm run episode:voice -- --episode sample --provider cosyvoice
  npm run episode:voice -- --episode avatar-demo --provider cosyvoice-clone
  npm run episode:voice -- --dir episodes/sample --provider macos-say --voice Ting-Ting
`);
};

const generateCloneVoiceover = async ({
  baseUrl,
  episodeDir,
  outputPath,
  sceneTexts,
  targetSceneDurationsSeconds,
  timeoutMs,
}: {
  baseUrl?: string;
  episodeDir: string;
  outputPath: string;
  sceneTexts: string[];
  targetSceneDurationsSeconds: number[];
  timeoutMs: number;
}) => {
  if (!(await flags.isEnabled(FLAGS.VOICE_CLONE, { isTeamMember: true }))) {
    throw new Error(
      "Voice cloning is disabled. Set FLAG_voice_clone to an enabled internal rule first.",
    );
  }

  if (!baseUrl) {
    throw new Error("CosyVoice clone requires AI_REMOTION_TTS_BASE_URL.");
  }

  const rightsPath = path.join(episodeDir, "rights.yaml");
  if (!existsSync(rightsPath)) {
    throw new Error("Voice cloning requires rights.yaml with explicit consent.");
  }

  const rights = parseRightsFile(rightsPath);
  const referenceAudioPath = resolveEpisodeAssetPath(
    episodeDir,
    rights.voice.reference_audio,
  );

  return generateSceneAlignedCosyVoiceClone({
    baseUrl,
    outputPath,
    referenceAudioPath,
    referenceText: rights.voice.reference_transcript,
    segmentsDir: path.join(episodeDir, "audio", "segments"),
    sceneTexts,
    targetSceneDurationsSeconds,
    timeoutMs,
  });
};

const resolveEpisodeAssetPath = (episodeDir: string, assetPath: string): string => {
  const resolvedPath = path.resolve(episodeDir, assetPath);
  const relativePath = path.relative(episodeDir, resolvedPath);

  if (
    relativePath === "" ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Asset path must stay within the episode: ${assetPath}`);
  }

  return resolvedPath;
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
