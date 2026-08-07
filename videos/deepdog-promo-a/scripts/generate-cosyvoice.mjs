import {execFileSync} from "node:child_process";
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const project = fileURLToPath(new URL("..", import.meta.url));
const outDir = path.join(project, "audio", "cosyvoice");
const baseUrl = process.env.AI_REMOTION_TTS_BASE_URL;
const speaker = process.env.DEEPDOG_COSYVOICE_SPEAKER || "中文男";
const speed = 1.15;
const gapSeconds = 0.09;

if (!baseUrl) throw new Error("AI_REMOTION_TTS_BASE_URL is required.");
rmSync(outDir, {force: true, recursive: true});
mkdirSync(outDir, {recursive: true});

const lines = JSON.parse(
  readFileSync(path.join(project, "audio", "cosyvoice-lines.json"), "utf8"),
);
if (
  !Array.isArray(lines) ||
  lines.length === 0 ||
  lines.some((line) => !Number.isInteger(line.frame) || !line.text?.trim()) ||
  new Set(lines.map((line) => line.frame)).size !== lines.length
) {
  throw new Error("CosyVoice lines must contain one non-empty request per unique frame.");
}
const segments = [];

for (const [index, line] of lines.entries()) {
  const stem = `seg_${String(index).padStart(2, "0")}`;
  const pcmPath = path.join(outDir, `${stem}.pcm`);
  const wavPath = path.join(outDir, `${stem}.wav`);
  const response = await fetch(
    new URL("inference_sft", `${baseUrl.replace(/\/+$/, "")}/`),
    {
      method: "POST",
      body: new URLSearchParams({spk_id: speaker, tts_text: line.text}),
    },
  );
  if (!response.ok) {
    throw new Error(
      `CosyVoice segment ${index + 1} failed: HTTP ${response.status}`,
    );
  }
  writeFileSync(pcmPath, Buffer.from(await response.arrayBuffer()));
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "s16le",
    "-ar",
    "24000",
    "-ac",
    "1",
    "-i",
    pcmPath,
    "-filter:a",
    `atempo=${speed}`,
    "-ar",
    "48000",
    "-ac",
    "1",
    wavPath,
  ]);
  const duration = Number(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        wavPath,
      ],
      {encoding: "utf8"},
    ).trim(),
  );
  segments.push({
    ...line,
    path: `audio/cosyvoice/${stem}.wav`,
    duration,
  });
}

const silencePath = path.join(outDir, "silence.wav");
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-f",
  "lavfi",
  "-i",
  "anullsrc=r=48000:cl=mono",
  "-t",
  String(gapSeconds),
  "-c:a",
  "pcm_s16le",
  silencePath,
]);

const concatList = segments
  .flatMap((segment, index) => [
    `file '${path.join(project, segment.path).replaceAll("'", "'\\''")}'`,
    ...(index < segments.length - 1
      ? [`file '${silencePath.replaceAll("'", "'\\''")}'`]
      : []),
  ])
  .join("\n");
const concatPath = path.join(outDir, "concat.txt");
writeFileSync(concatPath, `${concatList}\n`);
const voiceoverPath = path.join(outDir, "voiceover.wav");
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatPath,
  "-c:a",
  "pcm_s16le",
  voiceoverPath,
]);

let cursor = 0;
const timings = segments.map((segment, index) => {
  const start = cursor;
  const end = start + segment.duration;
  cursor = end + (index < segments.length - 1 ? gapSeconds : 0);
  return {...segment, start, end};
});

const toSrtTime = (seconds) => {
  const ms = Math.round(seconds * 1000);
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis).padStart(3, "0")}`;
};

const srt = timings
  .map(
    (item, index) =>
      `${index + 1}\n${toSrtTime(item.start)} --> ${toSrtTime(item.end)}\n${item.text}\n`,
  )
  .join("\n");

writeFileSync(path.join(outDir, "captions.srt"), srt);
writeFileSync(
  path.join(outDir, "timings.json"),
  `${JSON.stringify(
    {
      provider: "cosyvoice",
      speaker,
      speed,
      gap_seconds: gapSeconds,
      request_count: lines.length,
      requests_per_frame: 1,
      duration_seconds: cursor,
      segments: timings,
    },
    null,
    2,
  )}\n`,
);

const audioMetaPath = path.join(project, "audio_meta.json");
const audioMeta = JSON.parse(readFileSync(audioMetaPath, "utf8"));
audioMeta.voices = segments.map((segment, index) => ({
  frame: segment.frame,
  path: segment.path,
  duration_s: segment.duration,
  provider: "cosyvoice",
  speaker,
  speed,
  words: [
    {
      id: `segment-${index + 1}`,
      text: segment.text,
      start: 0,
      end: segment.duration,
    },
  ],
}));
writeFileSync(audioMetaPath, `${JSON.stringify(audioMeta, null, 2)}\n`);

console.log(
  JSON.stringify({
    duration_seconds: cursor,
    provider: "cosyvoice",
    speaker,
    speed,
    segments: segments.map(({frame, duration, path: segmentPath}) => ({
      frame,
      duration,
      path: segmentPath,
    })),
  }),
);
