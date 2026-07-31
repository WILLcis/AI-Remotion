import { existsSync } from "node:fs";
import path from "node:path";
import { FLAGS, flags } from "../../flags/feature-flags";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import { parseRenderPlanFile, parseRightsFile } from "../schemas";

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
  const plan = parseRenderPlanFile(path.join(episodeDir, "render-plan.json"));
  if (!plan.avatar?.enabled) {
    throw new Error("render-plan.avatar.enabled must be true for a talking avatar.");
  }

  const rightsPath = path.join(episodeDir, "rights.yaml");
  if (!existsSync(rightsPath)) {
    throw new Error("Missing rights.yaml with explicit voice and portrait consent.");
  }

  const rights = parseRightsFile(rightsPath);
  for (const assetPath of [rights.voice.reference_audio, rights.portrait.source]) {
    if (!existsSync(resolveEpisodeAssetPath(episodeDir, assetPath))) {
      throw new Error(`Missing consented asset: ${assetPath}`);
    }
  }

  const config = loadRuntimeConfig();
  if (!config.tts.baseUrl) {
    throw new Error("AI_REMOTION_TTS_BASE_URL is required for voice cloning.");
  }
  if (
    (config.avatar.provider === "musetalk" ||
      config.avatar.provider === "latentsync" ||
      config.avatar.provider === "infinitetalk" ||
      config.avatar.provider === "longcat") &&
    !config.avatar.baseUrl
  ) {
    throw new Error(
      `AI_REMOTION_AVATAR_BASE_URL is required for ${config.avatar.provider}.`,
    );
  }
  if (config.avatar.provider === "seedance") {
    if (
      !rights.cloud_processing ||
      rights.cloud_processing.provider !== "volcengine-ark" ||
      !rights.cloud_processing.data_processing_consent
    ) {
      throw new Error(
        "Seedance requires rights.yaml cloud_processing consent for Volcengine Ark.",
      );
    }
    for (const [name, value] of Object.entries({
      AI_REMOTION_ARK_API_KEY: config.avatar.arkApiKey,
      AI_REMOTION_ARK_MODEL: config.avatar.arkModel,
      AI_REMOTION_TOS_ACCESS_KEY_ID: config.avatar.tosAccessKeyId,
      AI_REMOTION_TOS_ACCESS_KEY_SECRET: config.avatar.tosAccessKeySecret,
      AI_REMOTION_TOS_BUCKET: config.avatar.tosBucket,
      AI_REMOTION_TOS_ENDPOINT: config.avatar.tosEndpoint,
      AI_REMOTION_TOS_REGION: config.avatar.tosRegion,
    })) {
      if (!value) {
        throw new Error(`${name} is required for Seedance.`);
      }
    }
    if (!(await flags.isEnabled(FLAGS.SEEDANCE_PRESENTER, { isTeamMember: true }))) {
      throw new Error("FLAG_seedance_presenter must be enabled for internal use.");
    }
  } else if (config.avatar.provider === "heygen") {
    if (
      !rights.cloud_processing ||
      rights.cloud_processing.provider !== "heygen" ||
      !rights.cloud_processing.data_processing_consent
    ) {
      throw new Error(
        "HeyGen requires rights.yaml cloud_processing consent for HeyGen.",
      );
    }
    if (!config.avatar.heygenApiKey) {
      throw new Error("HEYGEN_API_KEY is required for HeyGen.");
    }
    if (!(await flags.isEnabled(FLAGS.HEYGEN_AVATAR, { isTeamMember: true }))) {
      throw new Error("FLAG_heygen_avatar must be enabled for internal use.");
    }
  } else if (config.avatar.provider === "latentsync") {
    if (
      !(await flags.isEnabled(FLAGS.LATENTSYNC_LIPSYNC, {
        isTeamMember: true,
      }))
    ) {
      throw new Error("FLAG_latentsync_lipsync must be enabled for internal use.");
    }
  } else if (config.avatar.provider === "infinitetalk") {
    if (
      !(await flags.isEnabled(FLAGS.INFINITETALK_AVATAR, {
        isTeamMember: true,
      }))
    ) {
      throw new Error("FLAG_infinitetalk_avatar must be enabled for internal use.");
    }
  } else if (config.avatar.provider === "longcat") {
    if (
      !(await flags.isEnabled(FLAGS.LONGCAT_AVATAR, {
        isTeamMember: true,
      }))
    ) {
      throw new Error("FLAG_longcat_avatar must be enabled for internal use.");
    }
  } else if (config.avatar.provider !== "musetalk") {
    throw new Error(
      "AI_REMOTION_AVATAR_PROVIDER must be musetalk, seedance, latentsync, infinitetalk, longcat, or heygen for a talking avatar.",
    );
  }
  if (!(await flags.isEnabled(FLAGS.VOICE_CLONE, { isTeamMember: true }))) {
    throw new Error("FLAG_voice_clone must be enabled for internal use.");
  }
  if (!(await flags.isEnabled(FLAGS.TALKING_AVATAR, { isTeamMember: true }))) {
    throw new Error("FLAG_talking_avatar must be enabled for internal use.");
  }

  console.log(`Avatar prerequisites valid: ${path.relative(process.cwd(), episodeDir)}`);
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--episode" || arg === "--dir") {
      if (!next) {
        throw new Error(`${arg} requires a value`);
      }
      options[arg === "--episode" ? "episode" : "dir"] = next;
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

const printHelp = (): void => {
  console.log(`Validate talking-avatar consent, assets, flags, and local configuration.

Usage:
  npm run episode:avatar:check -- --episode avatar-demo
`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
