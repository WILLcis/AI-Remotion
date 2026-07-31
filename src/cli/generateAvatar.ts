import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { FLAGS, flags } from "../../flags/feature-flags";
import { generateInfiniteTalkAvatar } from "../avatar/infinitetalk";
import { generateHeyGenAvatar } from "../avatar/heygen";
import { generateLatentSyncAvatar } from "../avatar/latentsync";
import { generateLongCatAvatar } from "../avatar/longcat";
import { generateMuseTalkAvatar } from "../avatar/musetalk";
import {
  createTosSeedanceUploader,
  generateSeedanceAvatar,
  getSeedanceVideoNormalizationCommand,
  recoverSeedanceAvatar,
} from "../avatar/seedance";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import { parseRenderPlanFile, parseRightsFile } from "../schemas";

type CliOptions = {
  dir?: string;
  episode?: string;
  help: boolean;
  preflight: boolean;
  recoverTask?: string;
  scene?: string;
};

type VoiceSegment = {
  id: string;
  path?: string;
};

const execFileAsync = promisify(execFile);

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  if (!(await flags.isEnabled(FLAGS.TALKING_AVATAR, { isTeamMember: true }))) {
    throw new Error(
      "Talking avatar generation is disabled. Set FLAG_talking_avatar to an enabled internal rule first.",
    );
  }

  const episodeDir = resolveEpisodeDir(options);
  const renderPlanPath = path.join(episodeDir, "render-plan.json");
  const renderPlan = parseRenderPlanFile(renderPlanPath);
  if (!renderPlan.avatar?.enabled) {
    throw new Error(
      "Talking avatar generation requires render-plan.avatar.enabled to be true.",
    );
  }

  const runtimeConfig = loadRuntimeConfig();
  if (
    runtimeConfig.avatar.provider !== "musetalk" &&
    runtimeConfig.avatar.provider !== "seedance" &&
    runtimeConfig.avatar.provider !== "latentsync" &&
    runtimeConfig.avatar.provider !== "infinitetalk" &&
    runtimeConfig.avatar.provider !== "longcat" &&
    runtimeConfig.avatar.provider !== "heygen"
  ) {
    throw new Error(
      "Talking avatar generation requires AI_REMOTION_AVATAR_PROVIDER=musetalk, seedance, latentsync, infinitetalk, longcat, or heygen.",
    );
  }
  if (
    (runtimeConfig.avatar.provider === "musetalk" ||
      runtimeConfig.avatar.provider === "latentsync" ||
      runtimeConfig.avatar.provider === "infinitetalk" ||
      runtimeConfig.avatar.provider === "longcat") &&
    !runtimeConfig.avatar.baseUrl
  ) {
    throw new Error(
      `${runtimeConfig.avatar.provider} avatar generation requires AI_REMOTION_AVATAR_BASE_URL.`,
    );
  }

  const rightsPath = path.join(episodeDir, "rights.yaml");
  if (!existsSync(rightsPath)) {
    throw new Error("Talking avatar generation requires rights.yaml with explicit consent.");
  }

  const rights = parseRightsFile(rightsPath);
  if (
    runtimeConfig.avatar.provider === "seedance" &&
    !(await flags.isEnabled(FLAGS.SEEDANCE_PRESENTER, { isTeamMember: true }))
  ) {
    throw new Error(
      "Seedance presenter generation is disabled. Set FLAG_seedance_presenter to an enabled internal rule first.",
    );
  }
  if (
    runtimeConfig.avatar.provider === "latentsync" &&
    !(await flags.isEnabled(FLAGS.LATENTSYNC_LIPSYNC, { isTeamMember: true }))
  ) {
    throw new Error(
      "LatentSync generation is disabled. Set FLAG_latentsync_lipsync to an enabled internal rule first.",
    );
  }
  if (
    runtimeConfig.avatar.provider === "infinitetalk" &&
    !(await flags.isEnabled(FLAGS.INFINITETALK_AVATAR, { isTeamMember: true }))
  ) {
    throw new Error(
      "InfiniteTalk generation is disabled. Set FLAG_infinitetalk_avatar to an enabled internal rule first.",
    );
  }
  if (
    runtimeConfig.avatar.provider === "longcat" &&
    !(await flags.isEnabled(FLAGS.LONGCAT_AVATAR, { isTeamMember: true }))
  ) {
    throw new Error(
      "LongCat generation is disabled. Set FLAG_longcat_avatar to an enabled internal rule first.",
    );
  }
  if (
    runtimeConfig.avatar.provider === "heygen" &&
    !(await flags.isEnabled(FLAGS.HEYGEN_AVATAR, { isTeamMember: true }))
  ) {
    throw new Error(
      "HeyGen generation is disabled. Set FLAG_heygen_avatar to an enabled internal rule first.",
    );
  }
  if (
    runtimeConfig.avatar.provider === "seedance" &&
    (!rights.cloud_processing ||
      rights.cloud_processing.provider !== "volcengine-ark" ||
      !rights.cloud_processing.data_processing_consent)
  ) {
    throw new Error(
      "Seedance requires rights.yaml cloud_processing consent for Volcengine Ark.",
    );
  }
  if (
    runtimeConfig.avatar.provider === "heygen" &&
    (!rights.cloud_processing ||
      rights.cloud_processing.provider !== "heygen" ||
      !rights.cloud_processing.data_processing_consent)
  ) {
    throw new Error(
      "HeyGen requires rights.yaml cloud_processing consent for HeyGen.",
    );
  }
  const photoPath = resolveEpisodeAssetPath(episodeDir, rights.portrait.source);
  const referenceImageUrl = runtimeConfig.avatar.seedanceAvatarAssetId
    ? `asset://${runtimeConfig.avatar.seedanceAvatarAssetId}`
    : undefined;
  const segmentsPath = renderPlan.audio.segments_path
    ? resolveEpisodeAssetPath(episodeDir, renderPlan.audio.segments_path)
    : undefined;
  if (!segmentsPath || !existsSync(segmentsPath)) {
    throw new Error(
      "Talking avatar generation requires audio/segments.json from a scene-aligned voice clone.",
    );
  }

  const segments = parseVoiceSegments(segmentsPath);
  const isSeedance = runtimeConfig.avatar.provider === "seedance";
  const isLatentSync = runtimeConfig.avatar.provider === "latentsync";
  const isInfiniteTalk = runtimeConfig.avatar.provider === "infinitetalk";
  const isLongCat = runtimeConfig.avatar.provider === "longcat";
  const isHeyGen = runtimeConfig.avatar.provider === "heygen";
  let selectedScenes = selectScenes(renderPlan.scenes, options.scene);
  if (
    options.preflight &&
    (!(isSeedance || isLatentSync || isInfiniteTalk || isLongCat || isHeyGen) || !options.scene)
  ) {
    throw new Error(
      "Avatar preflight requires --scene <scene-id> and Seedance, LatentSync, InfiniteTalk, LongCat, or HeyGen.",
    );
  }
  if (options.recoverTask && (!isSeedance || !options.scene)) {
    throw new Error("Seedance task recovery requires --scene <scene-id>.");
  }
  const generatedClips = [];
  const avatarDir = path.join(episodeDir, "assets", "avatar");
  const outputDir = options.preflight
    ? path.join(avatarDir, "preflight", runtimeConfig.avatar.provider)
    : avatarDir;
  const usesStaging = isSeedance || isLatentSync || isInfiniteTalk || isLongCat || isHeyGen;
  const stagingDir = path.join(
    avatarDir,
    `.${runtimeConfig.avatar.provider}-staging`,
  );
  const manifestFileName = isLatentSync
    ? "latentsync-manifest.json"
    : isInfiniteTalk
      ? "infinitetalk-manifest.json"
      : isLongCat
        ? "longcat-manifest.json"
        : isHeyGen
          ? "heygen-manifest.json"
      : "manifest.json";
  const manifestPath = path.join(outputDir, manifestFileName);
  const stagingManifestPath = path.join(
    avatarDir,
    `.${runtimeConfig.avatar.provider}-manifest.staging.json`,
  );
  if (
    isSeedance &&
    !options.scene &&
    !options.preflight &&
    !options.recoverTask
  ) {
    const completedSceneIds = readManifestSceneIds(manifestPath);
    selectedScenes = selectedScenes.filter(
      (scene) =>
        !completedSceneIds.has(scene.id) ||
        !existsSync(path.join(avatarDir, `${scene.id}.mp4`)),
    );
  }
  if (usesStaging) {
    mkdirSync(stagingDir, { recursive: true });
    rmSync(stagingManifestPath, { force: true });
    if (!options.preflight && existsSync(manifestPath)) {
      copyFileSync(manifestPath, stagingManifestPath);
    }
  }
  const latentSyncSourcePath = path.join(avatarDir, ".latentsync-source.mp4");

  for (const scene of selectedScenes) {
    const segment = segments.find((candidate) => candidate.id === scene.id);
    if (!segment?.path) {
      throw new Error(`Missing persisted voice segment for scene: ${scene.id}`);
    }

    const audioPath = resolveEpisodeAssetPath(episodeDir, segment.path);
    const outputPath = path.join(outputDir, `${scene.id}.mp4`);
    if (isSeedance) {
      const seedanceOptions = {
        arkApiKey: requireValue(runtimeConfig.avatar.arkApiKey, "AI_REMOTION_ARK_API_KEY"),
        arkBaseUrl: runtimeConfig.avatar.arkBaseUrl,
        arkModel: requireValue(runtimeConfig.avatar.arkModel, "AI_REMOTION_ARK_MODEL"),
        audioPath,
        durationSeconds: scene.duration_seconds,
        episodeId: renderPlan.episode_id,
        manifestPath: stagingManifestPath,
        outputPath: path.join(stagingDir, `${scene.id}.mp4`),
        photoPath,
        prompt: getSeedancePrompt(scene),
        referenceImageUrl,
        sceneId: scene.id,
        timeoutMs: runtimeConfig.avatar.requestTimeoutMs,
        uploadAsset: createTosSeedanceUploader({
          accessKeyId: requireValue(
            runtimeConfig.avatar.tosAccessKeyId,
            "AI_REMOTION_TOS_ACCESS_KEY_ID",
          ),
          accessKeySecret: requireValue(
            runtimeConfig.avatar.tosAccessKeySecret,
            "AI_REMOTION_TOS_ACCESS_KEY_SECRET",
          ),
          bucket: requireValue(runtimeConfig.avatar.tosBucket, "AI_REMOTION_TOS_BUCKET"),
          endpoint: requireValue(
            runtimeConfig.avatar.tosEndpoint,
            "AI_REMOTION_TOS_ENDPOINT",
          ),
          prefix: runtimeConfig.avatar.tosPrefix,
          region: requireValue(runtimeConfig.avatar.tosRegion, "AI_REMOTION_TOS_REGION"),
          sessionToken: runtimeConfig.avatar.tosSessionToken,
        }),
      };
      if (options.recoverTask) {
        await recoverSeedanceAvatar({
          ...seedanceOptions,
          taskId: options.recoverTask,
        });
      } else {
        await generateSeedanceAvatar(seedanceOptions);
      }
      await normalizeSeedanceClip({
        durationSeconds: scene.duration_seconds,
        fps: renderPlan.video.fps,
        outputPath: path.join(stagingDir, `${scene.id}.mp4`),
      });
    } else {
      if (isHeyGen) {
        await generateHeyGenAvatar({
          apiKey: requireValue(runtimeConfig.avatar.heygenApiKey, "HEYGEN_API_KEY"),
          audioPath,
          baseUrl: runtimeConfig.avatar.heygenBaseUrl,
          durationSeconds: scene.duration_seconds,
          episodeId: renderPlan.episode_id,
          manifestPath: stagingManifestPath,
          outputPath: path.join(stagingDir, `${scene.id}.mp4`),
          photoPath,
          pollIntervalMs: runtimeConfig.avatar.heygenPollIntervalMs,
          sceneId: scene.id,
          timeoutMs: runtimeConfig.avatar.requestTimeoutMs,
        });
        await normalizeAvatarClip({
          durationSeconds: scene.duration_seconds,
          fps: renderPlan.video.fps,
          outputPath: path.join(stagingDir, `${scene.id}.mp4`),
        });
      } else if (isLatentSync) {
        await ensureLatentSyncSourceVideo({
          photoPath,
          sourceVideoPath: latentSyncSourcePath,
        });
        const latentSyncAudioPath = path.join(
          avatarDir,
          `.${scene.id}.latentsync-16k.wav`,
        );
        try {
          await resampleAvatarAudio({
            inputPath: audioPath,
            outputPath: latentSyncAudioPath,
          });
          await generateLatentSyncAvatar({
            audioPath: latentSyncAudioPath,
            baseUrl: runtimeConfig.avatar.baseUrl!,
          outputPath: path.join(stagingDir, `${scene.id}.mp4`),
            sourceVideoPath: latentSyncSourcePath,
            timeoutMs: runtimeConfig.avatar.requestTimeoutMs,
          });
          await normalizeAvatarClip({
            durationSeconds: scene.duration_seconds,
            fps: renderPlan.video.fps,
          outputPath: path.join(stagingDir, `${scene.id}.mp4`),
          });
        } finally {
          rmSync(latentSyncAudioPath, { force: true });
        }
      } else if (isInfiniteTalk) {
        const infiniteTalkAudioPath = path.join(
          avatarDir,
          `.${scene.id}.infinitetalk-16k.wav`,
        );
        try {
          await resampleAvatarAudio({
            inputPath: audioPath,
            outputPath: infiniteTalkAudioPath,
          });
          await generateInfiniteTalkAvatar({
            audioPath: infiniteTalkAudioPath,
            baseUrl: runtimeConfig.avatar.baseUrl!,
            outputPath: path.join(stagingDir, `${scene.id}.mp4`),
            photoPath,
            timeoutMs: runtimeConfig.avatar.requestTimeoutMs,
          });
          await normalizeAvatarClip({
            durationSeconds: scene.duration_seconds,
            fps: renderPlan.video.fps,
            outputPath: path.join(stagingDir, `${scene.id}.mp4`),
          });
        } finally {
          rmSync(infiniteTalkAudioPath, { force: true });
        }
      } else if (isLongCat) {
        const longCatAudioPath = path.join(
          avatarDir,
          `.${scene.id}.longcat-16k.wav`,
        );
        try {
          await resampleAvatarAudio({
            inputPath: audioPath,
            outputPath: longCatAudioPath,
          });
          await generateLongCatAvatar({
            audioPath: longCatAudioPath,
            baseUrl: runtimeConfig.avatar.baseUrl!,
            outputPath: path.join(stagingDir, `${scene.id}.mp4`),
            photoPath,
            timeoutMs: runtimeConfig.avatar.requestTimeoutMs,
          });
          await normalizeAvatarClip({
            durationSeconds: scene.duration_seconds,
            fps: renderPlan.video.fps,
            outputPath: path.join(stagingDir, `${scene.id}.mp4`),
          });
        } finally {
          rmSync(longCatAudioPath, { force: true });
        }
      } else {
        await generateMuseTalkAvatar({
          audioPath,
          baseUrl: runtimeConfig.avatar.baseUrl!,
          outputPath,
          photoPath,
          timeoutMs: runtimeConfig.avatar.requestTimeoutMs,
        });
      }
    }
    generatedClips.push({
      path: toPosixPath(path.relative(episodeDir, outputPath)),
      scene_id: scene.id,
    });
  }

  if (usesStaging) {
    mkdirSync(outputDir, { recursive: true });
    for (const scene of selectedScenes) {
      renameSync(
        path.join(stagingDir, `${scene.id}.mp4`),
        path.join(outputDir, `${scene.id}.mp4`),
      );
    }
    if (isSeedance || isHeyGen) {
      renameSync(stagingManifestPath, manifestPath);
    } else if (isLatentSync) {
      writeLatentSyncManifest({
        episodeId: renderPlan.episode_id,
        manifestPath,
        photoPath: rights.portrait.source,
        scenes: selectedScenes.map((scene) => ({
          audioPath: segments.find((segment) => segment.id === scene.id)?.path ?? "",
          durationSeconds: scene.duration_seconds,
          sceneId: scene.id,
        })),
      });
    } else if (isInfiniteTalk) {
      writeInfiniteTalkManifest({
        episodeId: renderPlan.episode_id,
        manifestPath,
        photoPath: rights.portrait.source,
        scenes: selectedScenes.map((scene) => ({
          audioPath: segments.find((segment) => segment.id === scene.id)?.path ?? "",
          durationSeconds: scene.duration_seconds,
          sceneId: scene.id,
        })),
      });
    } else if (isLongCat) {
      writeLongCatManifest({
        episodeId: renderPlan.episode_id,
        manifestPath,
        photoPath: rights.portrait.source,
        scenes: selectedScenes.map((scene) => ({
          audioPath: segments.find((segment) => segment.id === scene.id)?.path ?? "",
          durationSeconds: scene.duration_seconds,
          sceneId: scene.id,
        })),
      });
    }
    rmSync(stagingDir, { force: true, recursive: true });
  }

  if (options.preflight) {
    console.log(
      `Generated ${runtimeConfig.avatar.provider} preflight clip: ${generatedClips[0].path}`,
    );
    return;
  }

  const clips = [
    ...renderPlan.avatar.clips.filter(
      (clip) => !selectedScenes.some((scene) => scene.id === clip.scene_id),
    ),
    ...generatedClips,
  ];
  writeFileSync(
    renderPlanPath,
    `${JSON.stringify(
      {
        ...renderPlan,
        avatar: {
          ...renderPlan.avatar,
          audio_policy:
            isSeedance || isLatentSync || isInfiniteTalk || isLongCat || isHeyGen
              ? "remotion_mux"
              : renderPlan.avatar.audio_policy,
          clips,
          framing: isSeedance
            ? "full_body"
            : isLatentSync
              ? "head_only"
              : isInfiniteTalk
                ? "head_only"
                : isLongCat
                  ? "head_only"
                  : isHeyGen
                    ? "head_only"
                    : renderPlan.avatar.framing,
          manifest_path: isSeedance || isLatentSync || isInfiniteTalk || isLongCat || isHeyGen
            ? toPosixPath(path.relative(episodeDir, manifestPath))
            : undefined,
          photo_path: rights.portrait.source,
          provider: runtimeConfig.avatar.provider,
        },
      },
      null,
      2,
    )}\n`,
  );

  console.log(`Generated ${generatedClips.length} ${runtimeConfig.avatar.provider} avatar clips.`);
};

const getSeedancePrompt = ({
  narration,
}: {
  narration: string;
}): string =>
  [
    "以参考图片中的同一位主播为唯一人物，9:16竖屏固定中景。",
    "主播直视镜头，保持自然、专业的面部表情，并使用与讲解内容匹配的克制手势和上肢动作。",
    "动作连续稳定，不切镜，不改变服装、背景、人物身份或镜头角度。",
    "口型必须严格匹配参考音频中的普通话讲解；不要生成额外配乐、环境音或新的声音。",
    `本段讲解内容：${narration}`,
  ].join("");

const requireValue = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`${name} is required for Seedance.`);
  }
  return value;
};

const normalizeSeedanceClip = async ({
  durationSeconds,
  fps,
  outputPath,
}: {
  durationSeconds: number;
  fps: number;
  outputPath: string;
}): Promise<void> => {
  const normalizedPath = `${outputPath}.normalized.mp4`;
  try {
    await execFileAsync(
      "ffmpeg",
      getSeedanceVideoNormalizationCommand({
        durationSeconds,
        fps,
        inputPath: outputPath,
        outputPath: normalizedPath,
      }),
    );
    renameSync(normalizedPath, outputPath);
  } finally {
    rmSync(normalizedPath, { force: true });
  }
};

const ensureLatentSyncSourceVideo = async ({
  photoPath,
  sourceVideoPath,
}: {
  photoPath: string;
  sourceVideoPath: string;
}): Promise<void> => {
  if (existsSync(sourceVideoPath)) {
    return;
  }
  mkdirSync(path.dirname(sourceVideoPath), { recursive: true });
  await execFileAsync("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    photoPath,
    "-t",
    "60",
    "-r",
    "25",
    "-vf",
    "scale=512:512:force_original_aspect_ratio=increase,crop=512:512",
    "-an",
    "-pix_fmt",
    "yuv420p",
    sourceVideoPath,
  ]);
};

const resampleAvatarAudio = async ({
  inputPath,
  outputPath,
}: {
  inputPath: string;
  outputPath: string;
}): Promise<void> => {
  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    inputPath,
    "-ar",
    "16000",
    "-ac",
    "1",
    outputPath,
  ]);
};

const normalizeAvatarClip = async ({
  durationSeconds,
  fps,
  outputPath,
}: {
  durationSeconds: number;
  fps: number;
  outputPath: string;
}): Promise<void> => {
  const normalizedPath = `${outputPath}.normalized.mp4`;
  try {
    await execFileAsync("ffmpeg", [
      "-y",
      "-i",
      outputPath,
      "-map",
      "0:v:0",
      "-an",
      "-vf",
      `fps=${fps},scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280`,
      "-t",
      durationSeconds.toFixed(3),
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      normalizedPath,
    ]);
    renameSync(normalizedPath, outputPath);
  } finally {
    rmSync(normalizedPath, { force: true });
  }
};

const parseVoiceSegments = (filePath: string): VoiceSegment[] => {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
    segments?: VoiceSegment[];
  };

  if (!Array.isArray(parsed.segments)) {
    throw new Error(`Invalid scene segments file: ${filePath}`);
  }

  return parsed.segments;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = { help: false, preflight: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--preflight") {
      options.preflight = true;
      continue;
    }

    if (arg === "--episode" || arg === "--dir" || arg === "--scene" || arg === "--recover-task") {
      if (!next) {
        throw new Error(`${arg} requires a value`);
      }
      if (arg === "--episode") {
        options.episode = next;
      } else if (arg === "--dir") {
        options.dir = next;
      } else if (arg === "--recover-task") {
        options.recoverTask = next;
      } else {
        options.scene = next;
      }
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

const selectScenes = <T extends { id: string }>(
  scenes: T[],
  requestedSceneId: string | undefined,
): T[] => {
  if (!requestedSceneId) {
    return scenes;
  }
  const scene = scenes.find((candidate) => candidate.id === requestedSceneId);
  if (!scene) {
    throw new Error(`Unknown scene id: ${requestedSceneId}`);
  }
  return [scene];
};

const readManifestSceneIds = (manifestPath: string): Set<string> => {
  if (!existsSync(manifestPath)) {
    return new Set();
  }
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      clips?: Array<{ scene_id?: unknown }>;
    };
    return new Set(
      (parsed.clips ?? [])
        .map((clip) => clip.scene_id)
        .filter((sceneId): sceneId is string => typeof sceneId === "string"),
    );
  } catch {
    return new Set();
  }
};

const writeLatentSyncManifest = ({
  episodeId,
  manifestPath,
  photoPath,
  scenes,
}: {
  episodeId: string;
  manifestPath: string;
  photoPath: string;
  scenes: Array<{
    audioPath: string;
    durationSeconds: number;
    sceneId: string;
  }>;
}): void => {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        episode_id: episodeId,
        model: "LatentSync-1.6",
        provider: "latentsync",
        source_strategy: "static_portrait_video",
        source_photo: photoPath,
        scenes: scenes.map((scene) => ({
          audio_path: scene.audioPath,
          duration_seconds: scene.durationSeconds,
          input_hash: createHash("sha256")
            .update(`${photoPath}:${scene.audioPath}:${scene.durationSeconds}`)
            .digest("hex"),
          scene_id: scene.sceneId,
        })),
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
};

const writeInfiniteTalkManifest = ({
  episodeId,
  manifestPath,
  photoPath,
  scenes,
}: {
  episodeId: string;
  manifestPath: string;
  photoPath: string;
  scenes: Array<{
    audioPath: string;
    durationSeconds: number;
    sceneId: string;
  }>;
}): void => {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        episode_id: episodeId,
        model: "MeiGen-AI/InfiniteTalk",
        provider: "infinitetalk",
        source_strategy: "single_portrait_image",
        source_photo: photoPath,
        scenes: scenes.map((scene) => ({
          audio_path: scene.audioPath,
          duration_seconds: scene.durationSeconds,
          input_hash: createHash("sha256")
            .update(
              `${photoPath}:${scene.audioPath}:${scene.durationSeconds}:infinitetalk-480`,
            )
            .digest("hex"),
          parameters: {
            mode: "streaming",
            sample_steps: 40,
            size: "infinitetalk-480",
          },
          scene_id: scene.sceneId,
        })),
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
};

const writeLongCatManifest = ({
  episodeId,
  manifestPath,
  photoPath,
  scenes,
}: {
  episodeId: string;
  manifestPath: string;
  photoPath: string;
  scenes: Array<{
    audioPath: string;
    durationSeconds: number;
    sceneId: string;
  }>;
}): void => {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    `${JSON.stringify(
      {
        episode_id: episodeId,
        model: "meituan-longcat/LongCat-Video-Avatar-1.5",
        provider: "longcat",
        source_strategy: "single_portrait_image",
        source_photo: photoPath,
        scenes: scenes.map((scene) => ({
          audio_path: scene.audioPath,
          duration_seconds: scene.durationSeconds,
          input_hash: createHash("sha256")
            .update(
              `${photoPath}:${scene.audioPath}:${scene.durationSeconds}:longcat-avatar-v1.5`,
            )
            .digest("hex"),
          parameters: {
            resolution: "480p",
            runtime: "single-gpu-int8-lowmem",
          },
          scene_id: scene.sceneId,
        })),
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
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

const toPosixPath = (filePath: string): string => filePath.split(path.sep).join("/");

const printHelp = (): void => {
  console.log(`Generate scene-aligned talking-avatar clips.

Usage:
  npm run episode:avatar -- --episode avatar-demo
  npm run episode:avatar -- --episode avatar-demo --scene scene-01 --preflight
  npm run episode:avatar -- --episode avatar-demo --scene scene-01 --recover-task <task-id>
`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
