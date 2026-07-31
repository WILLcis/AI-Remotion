import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { getEpisodeVoiceoverStaticPath } from "../remotion/episodeAudio";
import { getEpisodeAssetStaticPath } from "../remotion/episodeAssets";
import { parseRenderPlanFile, type RenderScene } from "../schemas";

const execFileAsync = promisify(execFile);

export type RenderCommand = {
  args: string[];
  executable: string;
};

export type RenderEpisodeOptions = {
  compositionId?: string;
  entryPoint?: string;
  episodeDir: string;
  outputPath?: string;
};

export type RenderEpisodeResult = {
  command: RenderCommand;
  outputPath: string;
};

export const renderEpisode = async ({
  compositionId = "ExplainerVideo",
  entryPoint = "src/remotion/index.ts",
  episodeDir,
  outputPath,
}: RenderEpisodeOptions): Promise<RenderEpisodeResult> => {
  const renderPlanPath = path.join(episodeDir, "render-plan.json");
  const renderPlan = parseRenderPlanFile(renderPlanPath);
  const missingAssets = findMissingLocalAssets({
    additionalAssets: renderPlan.avatar?.clips.map((clip) => clip.path),
    episodeDir,
    scenes: renderPlan.scenes,
  });

  if (missingAssets.length > 0) {
    throw new Error(`Missing local render assets: ${missingAssets.join(", ")}`);
  }

  const resolvedOutputPath = resolveEpisodeOutputPath({ episodeDir, outputPath });
  mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });

  const command = getEpisodeRenderCommand({
    compositionId,
    entryPoint,
    outputPath: resolvedOutputPath,
    renderPlanPath,
  });
  const stagedVoiceoverPath = stageVoiceoverForRender({
    episodeDir,
    episodeId: renderPlan.episode_id,
    voiceoverPath: renderPlan.audio.voiceover_path,
  });
  const stagedAvatarPaths = stageAvatarClipsForRender({
    clips: renderPlan.avatar?.clips ?? [],
    episodeDir,
    episodeId: renderPlan.episode_id,
  });

  try {
    await execFileAsync(command.executable, command.args);
  } finally {
    if (stagedVoiceoverPath) {
      rmSync(stagedVoiceoverPath, { force: true });
    }
    for (const stagedAvatarPath of stagedAvatarPaths) {
      rmSync(stagedAvatarPath, { force: true });
    }
  }

  return {
    command,
    outputPath: resolvedOutputPath,
  };
};

export const stageAvatarClipsForRender = ({
  clips,
  episodeDir,
  episodeId,
}: {
  clips: Array<{ path: string }>;
  episodeDir: string;
  episodeId: string;
}): string[] => {
  return clips.map((clip) =>
    stageEpisodeAssetForRender({
      assetPath: clip.path,
      episodeDir,
      episodeId,
    }),
  );
};

const stageEpisodeAssetForRender = ({
  assetPath,
  episodeDir,
  episodeId,
}: {
  assetPath: string;
  episodeDir: string;
  episodeId: string;
}): string => {
  const sourcePath = path.resolve(episodeDir, assetPath);
  const sourceRelativePath = path.relative(episodeDir, sourcePath);
  if (
    sourceRelativePath === "" ||
    sourceRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(sourceRelativePath)
  ) {
    throw new Error(`Asset path must stay within the episode: ${assetPath}`);
  }

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing local asset: ${assetPath}`);
  }

  const publicRoot = path.resolve("public");
  const stagedPath = path.resolve(
    publicRoot,
    getEpisodeAssetStaticPath({ assetPath, episodeId }),
  );
  const stagedRelativePath = path.relative(publicRoot, stagedPath);
  if (
    stagedRelativePath === "" ||
    stagedRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(stagedRelativePath)
  ) {
    throw new Error(`Unsafe asset staging path: ${assetPath}`);
  }

  mkdirSync(path.dirname(stagedPath), { recursive: true });
  copyFileSync(sourcePath, stagedPath);
  return stagedPath;
};

const stageVoiceoverForRender = ({
  episodeDir,
  episodeId,
  voiceoverPath,
}: {
  episodeDir: string;
  episodeId: string;
  voiceoverPath: string | null;
}): string | undefined => {
  if (!voiceoverPath) {
    return undefined;
  }

  const sourcePath = path.resolve(episodeDir, voiceoverPath);
  const sourceRelativePath = path.relative(episodeDir, sourcePath);
  if (
    sourceRelativePath === "" ||
    sourceRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(sourceRelativePath)
  ) {
    throw new Error(`Voiceover path must stay within the episode: ${voiceoverPath}`);
  }

  if (!existsSync(sourcePath)) {
    throw new Error(`Missing local voiceover: ${voiceoverPath}`);
  }

  const publicRoot = path.resolve("public");
  const stagedPath = path.resolve(
    publicRoot,
    getEpisodeVoiceoverStaticPath({ episodeId, voiceoverPath }),
  );
  const stagedRelativePath = path.relative(publicRoot, stagedPath);
  if (
    stagedRelativePath === "" ||
    stagedRelativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(stagedRelativePath)
  ) {
    throw new Error(`Unsafe voiceover staging path: ${voiceoverPath}`);
  }

  mkdirSync(path.dirname(stagedPath), { recursive: true });
  copyFileSync(sourcePath, stagedPath);
  return stagedPath;
};

export const resolveEpisodeOutputPath = ({
  episodeDir,
  outputPath,
}: {
  episodeDir: string;
  outputPath?: string;
}): string => {
  return outputPath ? path.resolve(outputPath) : path.join(episodeDir, "out", "final.mp4");
};

export const getEpisodeRenderCommand = ({
  compositionId = "ExplainerVideo",
  entryPoint = "src/remotion/index.ts",
  outputPath,
  renderPlanPath,
}: {
  compositionId?: string;
  entryPoint?: string;
  outputPath: string;
  renderPlanPath: string;
}): RenderCommand => {
  return {
    args: [
      "remotion",
      "render",
      entryPoint,
      compositionId,
      outputPath,
      `--props=${renderPlanPath}`,
      "--timeout=120000",
    ],
    executable: "npx",
  };
};

export const findMissingLocalAssets = ({
  additionalAssets = [],
  episodeDir,
  scenes,
}: {
  additionalAssets?: string[];
  episodeDir: string;
  scenes: Array<Pick<RenderScene, "visual">>;
}): string[] => {
  const assetRefs = [
    ...scenes.flatMap((scene) => scene.visual.assets ?? []),
    ...additionalAssets,
  ];
  const fileLikeAssets = assetRefs.filter(isFileLikeAsset);

  return fileLikeAssets.filter((asset) => !existsSync(path.join(episodeDir, asset)));
};

const isFileLikeAsset = (asset: string): boolean => {
  return asset.includes("/") || /\.[a-z0-9]{2,5}$/i.test(asset);
};
