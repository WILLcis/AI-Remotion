import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { FLAGS, flags } from "../../flags/feature-flags";
import { renderHyperFrames } from "../hyperframes/heygen";

const execFileAsync = promisify(execFile);
const episodeDir = path.resolve("episodes/ai-remotion-hyperframes-promo");
const compositionDir = path.join(episodeDir, "hyperframes");
const isDraft = process.argv.includes("--draft");
const outputPath = path.join(episodeDir, "out", isDraft ? "draft.mp4" : "final.mp4");
const bundlePath = path.join(episodeDir, "out", isDraft ? "hyperframes-draft.zip" : "hyperframes-promo.zip");

const main = async (): Promise<void> => {
  if (!(await flags.isEnabled(FLAGS.HEYGEN_HYPERFRAMES, { isTeamMember: true }))) {
    throw new Error("HyperFrames is disabled. Set FLAG_heygen_hyperframes to an enabled internal rule.");
  }
  if (!process.env.HEYGEN_API_KEY) {
    throw new Error("HEYGEN_API_KEY is required for HyperFrames.");
  }
  if (!existsSync(path.join(compositionDir, "index.html"))) {
    throw new Error("HyperFrames composition is missing index.html.");
  }
  mkdirSync(path.dirname(bundlePath), { recursive: true });
  const bundleSourceDir = isDraft
    ? writeDraftComposition()
    : compositionDir;
  await execFileAsync("zip", ["-q", "-r", bundlePath, "index.html"], { cwd: bundleSourceDir });
  const renderId = await renderHyperFrames({
    apiKey: process.env.HEYGEN_API_KEY,
    bundlePath,
    outputPath,
    title: isDraft ? "AI-Remotion product promo draft" : "AI-Remotion product promo",
  });
  writeFileSync(
    path.join(episodeDir, "out", "hyperframes-manifest.json"),
    `${JSON.stringify({ composition: "hyperframes/index.html", render_id: renderId, version: 1 }, null, 2)}\n`,
  );
  console.log(`Generated HyperFrames promo: ${path.relative(process.cwd(), outputPath)}`);
};

const writeDraftComposition = (): string => {
  const draftDir = path.join(episodeDir, "out", "hyperframes-draft");
  mkdirSync(draftDir, { recursive: true });
  writeFileSync(
    path.join(draftDir, "index.html"),
    readFileSync(path.join(compositionDir, "index.html"), "utf8").replace(
      'data-composition-duration="60"',
      'data-composition-duration="10"',
    ),
  );
  return draftDir;
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
