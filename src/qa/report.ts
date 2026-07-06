import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEpisodeArtifacts } from "../schemas";

export type QaStatus = "pass" | "warn" | "fail";

export type QaCheck = {
  details: string;
  id: string;
  status: QaStatus;
  title: string;
};

export type QaReport = {
  checks: QaCheck[];
  episodeDir: string;
  generatedAt: string;
  knownLimitations: string[];
  outputFile: string;
  summary: {
    fail: number;
    pass: number;
    warn: number;
  };
};

export type GenerateQaReportOptions = {
  episodeDir: string;
  outputFile?: string;
};

export const generateQaReport = ({
  episodeDir,
  outputFile = path.join(episodeDir, "out", "final.mp4"),
}: GenerateQaReportOptions): QaReport => {
  const artifacts = loadEpisodeArtifacts(episodeDir);
  const frameDurationSeconds =
    artifacts.renderPlan.video.duration_frames / artifacts.renderPlan.video.fps;
  const checks: QaCheck[] = [
    checkVideoFile(outputFile),
    {
      details: `Render plan duration is ${frameDurationSeconds.toFixed(
        3,
      )}s for ${artifacts.renderPlan.video.duration_frames} frames at ${
        artifacts.renderPlan.video.fps
      }fps.`,
      id: "duration",
      status:
        Math.abs(frameDurationSeconds - artifacts.renderPlan.metadata.duration_seconds) <=
        0.25
          ? "pass"
          : "fail",
      title: "Duration Matches Render Plan",
    },
    checkFrameStills(episodeDir),
    checkCaptions(episodeDir, artifacts.renderPlan.captions.items),
    checkVoiceover(episodeDir, artifacts.renderPlan.audio),
    checkAssets(episodeDir, artifacts.renderPlan.scenes),
    checkManualVerification(episodeDir),
  ];
  const summary = summarizeChecks(checks);

  return {
    checks,
    episodeDir,
    generatedAt: new Date().toISOString(),
    knownLimitations: [
      "Playable media probing uses file existence/size unless ffprobe integration is added.",
      "Frame blank detection uses rendered still file-size heuristics, not full pixel analysis.",
      "Caption overflow detection uses text-length heuristics; visual overlap still needs human review.",
    ],
    outputFile,
    summary,
  };
};

export const writeQaReport = (report: QaReport): string => {
  const reportPath = path.join(report.episodeDir, "qa-report.md");
  writeFileSync(reportPath, `${renderQaReportMarkdown(report)}\n`);
  return reportPath;
};

export const renderQaReportMarkdown = (report: QaReport): string => {
  return [
    "# QA Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    `Output: ${path.relative(report.episodeDir, report.outputFile)}`,
    "",
    "## Summary",
    "",
    `- Pass: ${report.summary.pass}`,
    `- Warn: ${report.summary.warn}`,
    `- Fail: ${report.summary.fail}`,
    "",
    "## Checks",
    "",
    ...report.checks.flatMap((check) => [
      `### ${statusLabel(check.status)} ${check.title}`,
      "",
      check.details,
      "",
    ]),
    "## Known Limitations",
    "",
    ...report.knownLimitations.map((limitation) => `- ${limitation}`),
  ].join("\n");
};

const checkVideoFile = (outputFile: string): QaCheck => {
  if (!existsSync(outputFile)) {
    return {
      details: `Missing output file: ${outputFile}`,
      id: "video-file",
      status: "fail",
      title: "Video File Exists",
    };
  }

  const size = statSync(outputFile).size;
  return {
    details: `Found output file (${formatBytes(size)}). Container playability is listed as a known limitation until ffprobe is wired in.`,
    id: "video-file",
    status: size > 0 ? "pass" : "fail",
    title: "Video File Exists",
  };
};

const checkFrameStills = (episodeDir: string): QaCheck => {
  const frameDir = path.join(episodeDir, "out", "qa-frames");
  const frames = ["first.png", "middle.png", "final.png"];
  const missing = frames.filter((frame) => !existsSync(path.join(frameDir, frame)));

  if (missing.length > 0) {
    return {
      details: `Missing QA frame stills: ${missing.join(", ")}. Run episode:qa with --render-frames to generate them.`,
      id: "frame-stills",
      status: "warn",
      title: "First/Middle/Final Frames",
    };
  }

  const tiny = frames.filter((frame) => statSync(path.join(frameDir, frame)).size < 1024);

  return {
    details:
      tiny.length === 0
        ? "First, middle, and final still files exist and are non-trivially sized."
        : `Potentially blank or invalid stills: ${tiny.join(", ")}`,
    id: "frame-stills",
    status: tiny.length === 0 ? "pass" : "warn",
    title: "First/Middle/Final Frames",
  };
};

const checkCaptions = (
  episodeDir: string,
  captions: Array<{ text: string }>,
): QaCheck => {
  const srtPath = path.join(episodeDir, "captions.srt");
  const longCaptions = captions.filter((caption) => caption.text.length > 48);

  if (!existsSync(srtPath)) {
    return {
      details: "Missing captions.srt.",
      id: "captions",
      status: "fail",
      title: "Captions Exist And Fit Heuristics",
    };
  }

  return {
    details:
      longCaptions.length === 0
        ? `Found ${captions.length} structured captions and captions.srt.`
        : `${longCaptions.length} captions exceed the mobile readability heuristic.`,
    id: "captions",
    status: longCaptions.length === 0 ? "pass" : "warn",
    title: "Captions Exist And Fit Heuristics",
  };
};

const checkVoiceover = (
  episodeDir: string,
  audio: { duration_seconds: number | null; voiceover_path: string | null },
): QaCheck => {
  if (!audio.voiceover_path) {
    return {
      details: "No voiceover is required by the render plan.",
      id: "voiceover",
      status: "pass",
      title: "Voiceover Exists If Required",
    };
  }

  const voiceoverPath = path.join(episodeDir, audio.voiceover_path);
  const exists = existsSync(voiceoverPath);
  const hasDuration = audio.duration_seconds !== null && audio.duration_seconds > 0;

  return {
    details: exists
      ? `Found voiceover at ${audio.voiceover_path}; duration metadata: ${
          audio.duration_seconds?.toFixed(3) ?? "missing"
        }s.`
      : `Missing voiceover at ${audio.voiceover_path}.`,
    id: "voiceover",
    status: exists && hasDuration ? "pass" : "fail",
    title: "Voiceover Exists If Required",
  };
};

const checkAssets = (
  episodeDir: string,
  scenes: Array<{ visual: { assets?: string[] } }>,
): QaCheck => {
  const assetRefs = scenes.flatMap((scene) => scene.visual.assets ?? []);
  const fileLikeAssets = assetRefs.filter(isFileLikeAsset);
  const missing = fileLikeAssets.filter((asset) => !existsSync(path.join(episodeDir, asset)));

  return {
    details:
      missing.length === 0
        ? `No missing local asset paths. Non-file visual labels: ${
            assetRefs.length - fileLikeAssets.length
          }.`
        : `Missing local asset paths: ${missing.join(", ")}`,
    id: "assets",
    status: missing.length === 0 ? "pass" : "fail",
    title: "Render Plan Assets Exist",
  };
};

const checkManualVerification = (episodeDir: string): QaCheck => {
  const scriptPath = path.join(episodeDir, "script.md");
  if (!existsSync(scriptPath)) {
    return {
      details: "Missing script.md; manual factual review cannot be scanned.",
      id: "manual-verification",
      status: "warn",
      title: "Manual Verification Reminders",
    };
  }

  const script = readFileSync(scriptPath, "utf8");
  const reminders = script
    .split("\n")
    .filter((line) => /VERIFY|TODO|需核实|待核实|manual review/i.test(line));

  return {
    details:
      reminders.length === 0
        ? "No explicit manual verification markers found."
        : reminders.join("\n"),
    id: "manual-verification",
    status: reminders.length === 0 ? "pass" : "warn",
    title: "Manual Verification Reminders",
  };
};

const summarizeChecks = (checks: QaCheck[]): QaReport["summary"] => {
  return {
    fail: checks.filter((check) => check.status === "fail").length,
    pass: checks.filter((check) => check.status === "pass").length,
    warn: checks.filter((check) => check.status === "warn").length,
  };
};

const statusLabel = (status: QaStatus): string => {
  if (status === "pass") {
    return "PASS";
  }

  if (status === "warn") {
    return "WARN";
  }

  return "FAIL";
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
};

const isFileLikeAsset = (asset: string): boolean => {
  return asset.includes("/") || /\.[a-z0-9]{2,5}$/i.test(asset);
};
