import { execFile } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { FLAGS, flags } from "../../flags/feature-flags";
import { renderHyperFrames } from "../hyperframes/heygen";

const execFileAsync = promisify(execFile);
const episodeDir = path.resolve("episodes/deepdog-promo");
const isEffects = process.argv.includes("--effects");
const compositionName = isEffects ? "hyperframes-effects" : "hyperframes";
const compositionDir = path.join(episodeDir, compositionName);
const outputDir = path.join(episodeDir, "out");
const bundlePath = path.join(
  outputDir,
  isEffects ? "deepdog-hyperframes-effects.zip" : "deepdog-hyperframes.zip",
);
const silentOutputPath = path.join(
  outputDir,
  isEffects ? "hyperframes-effects-silent.mp4" : "hyperframes-silent.mp4",
);

const main = async (): Promise<void> => {
  if (!(await flags.isEnabled(FLAGS.HEYGEN_HYPERFRAMES, { isTeamMember: true }))) {
    throw new Error(
      "HyperFrames is disabled. Enable FLAG_heygen_hyperframes for internal use.",
    );
  }
  if (!process.env.HEYGEN_API_KEY) {
    throw new Error("HEYGEN_API_KEY is required for the deepdog promo.");
  }
  if (!existsSync(path.join(compositionDir, "index.html"))) {
    throw new Error("Missing deepdog Hyperframes composition.");
  }

  mkdirSync(outputDir, { recursive: true });
  rmSync(bundlePath, { force: true });
  await execFileAsync(
    "zip",
    ["-q", "-r", bundlePath, "index.html", "assets"],
    { cwd: compositionDir },
  );

  const renderId = await renderHyperFrames({
    apiKey: process.env.HEYGEN_API_KEY,
    aspectRatio: "16:9",
    bundlePath,
    fps: 30,
    outputPath: silentOutputPath,
    timeoutMs: 1_200_000,
    title: isEffects
      ? "deepdog product promo — technical effects cut"
      : "deepdog product promo",
  });

  writeFileSync(
    path.join(
      outputDir,
      isEffects
        ? "hyperframes-effects-manifest.json"
        : "hyperframes-manifest.json",
    ),
    `${JSON.stringify(
      {
        composition: `${compositionName}/index.html`,
        render_id: renderId,
        variant: isEffects ? "effects" : "standard",
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Generated deepdog Hyperframes visuals: ${path.relative(process.cwd(), silentOutputPath)}`,
  );
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
