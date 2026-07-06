import { execFile } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
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
  await execFileAsync(command.executable, command.args);

  return {
    command,
    outputPath: resolvedOutputPath,
  };
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
    ],
    executable: "npx",
  };
};

export const findMissingLocalAssets = ({
  episodeDir,
  scenes,
}: {
  episodeDir: string;
  scenes: Array<Pick<RenderScene, "visual">>;
}): string[] => {
  const assetRefs = scenes.flatMap((scene) => scene.visual.assets ?? []);
  const fileLikeAssets = assetRefs.filter(isFileLikeAsset);

  return fileLikeAssets.filter((asset) => !existsSync(path.join(episodeDir, asset)));
};

const isFileLikeAsset = (asset: string): boolean => {
  return asset.includes("/") || /\.[a-z0-9]{2,5}$/i.test(asset);
};
