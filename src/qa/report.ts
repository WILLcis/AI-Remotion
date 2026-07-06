import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEpisodeArtifacts, type RenderPlan } from "../schemas";

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

export type MediaProbeResult =
  | {
      durationSeconds: number | null;
      hasAudio: boolean | null;
      height: number | null;
      ok: true;
      width: number | null;
    }
  | {
      ok: false;
      reason: string;
      unavailable?: boolean;
    };

export type MediaProbe = (outputFile: string) => MediaProbeResult;

export type GenerateQaReportOptions = {
  episodeDir: string;
  mediaProbe?: MediaProbe;
  outputFile?: string;
};

export const generateQaReport = ({
  episodeDir,
  mediaProbe = probeMediaFile,
  outputFile = path.join(episodeDir, "out", "final.mp4"),
}: GenerateQaReportOptions): QaReport => {
  const artifacts = loadEpisodeArtifacts(episodeDir);
  const frameDurationSeconds =
    artifacts.renderPlan.video.duration_frames / artifacts.renderPlan.video.fps;
  const checks: QaCheck[] = [
    checkVideoFile(outputFile),
    checkMediaProbe({
      outputFile,
      probe: mediaProbe,
      renderPlan: artifacts.renderPlan,
    }),
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
      "Media probing depends on local ffprobe; when unavailable QA falls back to file-size checks.",
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
    details: `Found output file (${formatBytes(size)}).`,
    id: "video-file",
    status: size > 0 ? "pass" : "fail",
    title: "Video File Exists",
  };
};

const checkMediaProbe = ({
  outputFile,
  probe,
  renderPlan,
}: {
  outputFile: string;
  probe: MediaProbe;
  renderPlan: RenderPlan;
}): QaCheck => {
  if (!existsSync(outputFile)) {
    return {
      details: `Missing output file: ${outputFile}`,
      id: "media-probe",
      status: "fail",
      title: "Media Container Probe",
    };
  }

  const result = probe(outputFile);
  if (!result.ok) {
    return {
      details: result.reason,
      id: "media-probe",
      status: result.unavailable ? "warn" : "fail",
      title: "Media Container Probe",
    };
  }

  const expectedDurationSeconds =
    renderPlan.video.duration_frames / renderPlan.video.fps;
  const durationMatches =
    result.durationSeconds === null ||
    Math.abs(result.durationSeconds - expectedDurationSeconds) <= 1;
  const resolutionMatches =
    result.width === null ||
    result.height === null ||
    (result.width === renderPlan.video.width && result.height === renderPlan.video.height);
  const status = durationMatches && resolutionMatches ? "pass" : "fail";

  return {
    details: [
      `Duration: ${formatOptionalSeconds(result.durationSeconds)}`,
      `Resolution: ${formatResolution(result.width, result.height)}`,
      `Audio stream: ${formatOptionalBoolean(result.hasAudio)}`,
    ].join("\n"),
    id: "media-probe",
    status,
    title: "Media Container Probe",
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

export const probeMediaFile = (outputFile: string): MediaProbeResult => {
  let raw: string;

  try {
    raw = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        outputFile,
      ],
      { encoding: "utf8" },
    );
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";

    return {
      ok: false,
      reason:
        code === "ENOENT"
          ? "ffprobe is not installed or not available on PATH."
          : `ffprobe failed for ${outputFile}.`,
      unavailable: code === "ENOENT",
    };
  }

  let data: {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      duration?: string;
      height?: number;
      width?: number;
    }>;
  };

  try {
    data = JSON.parse(raw) as typeof data;
  } catch {
    return {
      ok: false,
      reason: "ffprobe returned invalid JSON.",
    };
  }
  const streams = data.streams ?? [];
  const videoStream = streams.find((stream) => stream.codec_type === "video");

  if (!videoStream) {
    return {
      ok: false,
      reason: "ffprobe did not find a video stream.",
    };
  }

  return {
    durationSeconds: parseOptionalNumber(
      data.format?.duration ?? videoStream.duration,
    ),
    hasAudio: streams.some((stream) => stream.codec_type === "audio"),
    height: videoStream.height ?? null,
    ok: true,
    width: videoStream.width ?? null,
  };
};

const parseOptionalNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatOptionalSeconds = (value: number | null): string => {
  return value === null ? "unknown" : `${value.toFixed(3)}s`;
};

const formatResolution = (width: number | null, height: number | null): string => {
  return width === null || height === null ? "unknown" : `${width}x${height}`;
};

const formatOptionalBoolean = (value: boolean | null): string => {
  if (value === null) {
    return "unknown";
  }

  return value ? "yes" : "no";
};

const isFileLikeAsset = (asset: string): boolean => {
  return asset.includes("/") || /\.[a-z0-9]{2,5}$/i.test(asset);
};
