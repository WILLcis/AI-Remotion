#!/usr/bin/env node
/**
 * CosyVoice Mandarin male VO for YesONO MiniMax 11×15s cut.
 * Spoken text uses "Yes or No 3.0"; captions keep brand "YesONO".
 * Fits each clip into <=15s by auto atempo if needed.
 */
import {execFileSync} from "node:child_process";
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const outDir = path.join(project, "audio", "cosyvoice");
const baseUrl = process.env.AI_REMOTION_TTS_BASE_URL || "http://127.0.0.1:8000";
const speaker = clips.voice.speaker || "中文男";
const targetSpeed = Number(clips.voice.speed || 1.22);
const maxSeconds = Number(clips.seconds_per_clip || 15);
const gapSeconds = 0.08;

rmSync(outDir, {force: true, recursive: true});
mkdirSync(outDir, {recursive: true});

function probeDuration(file) {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      {encoding: "utf8"},
    ).trim(),
  );
}

function atempoChain(factor) {
  // ffmpeg atempo accepts 0.5–2.0; chain if needed
  const filters = [];
  let remaining = factor;
  while (remaining > 2.0) {
    filters.push("atempo=2.0");
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters.join(",");
}

const segments = [];

for (const [index, clip] of clips.clips.entries()) {
  const stem = `seg_${String(index).padStart(2, "0")}`;
  const pcmPath = path.join(outDir, `${stem}.pcm`);
  const rawWav = path.join(outDir, `${stem}_raw.wav`);
  const wavPath = path.join(outDir, `${stem}.wav`);

  process.stdout.write(`CosyVoice ${clip.id}/11 … `);
  const response = await fetch(new URL("inference_sft", `${baseUrl.replace(/\/+$/, "")}/`), {
    method: "POST",
    body: new URLSearchParams({spk_id: speaker, tts_text: clip.spoken}),
  });
  if (!response.ok) {
    throw new Error(`CosyVoice ${clip.id} HTTP ${response.status}`);
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
    atempoChain(targetSpeed),
    "-ar",
    "48000",
    "-ac",
    "1",
    rawWav,
  ]);

  let duration = probeDuration(rawWav);
  let appliedSpeed = targetSpeed;
  if (duration > maxSeconds - 0.15) {
    const extra = duration / (maxSeconds - 0.2);
    appliedSpeed = targetSpeed * extra;
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      rawWav,
      "-filter:a",
      atempoChain(extra),
      "-ar",
      "48000",
      wavPath,
    ]);
    duration = probeDuration(wavPath);
  } else {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", rawWav, "-c", "copy", wavPath]);
  }

  console.log(`${duration.toFixed(2)}s speed≈${appliedSpeed.toFixed(2)}`);
  segments.push({
    id: clip.id,
    title: clip.title,
    caption: clip.caption,
    spoken: clip.spoken,
    path: `audio/cosyvoice/${stem}.wav`,
    duration,
    speed: appliedSpeed,
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

// Pad each segment audio to exactly 15s with trailing silence for A/V lock to MiniMax clips.
const padded = [];
for (const [index, seg] of segments.entries()) {
  const stem = `seg_${String(index).padStart(2, "0")}`;
  const src = path.join(project, seg.path);
  const padPath = path.join(outDir, `${stem}_pad.wav`);
  const pad = Math.max(0, maxSeconds - seg.duration);
  if (pad > 0.01) {
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      src,
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=mono",
      "-filter_complex",
      `[0:a][1:a]concat=n=2:v=0:a=1[a]`,
      "-map",
      "[a]",
      "-t",
      String(maxSeconds),
      padPath,
    ]);
  } else {
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-i",
      src,
      "-t",
      String(maxSeconds),
      "-c:a",
      "pcm_s16le",
      padPath,
    ]);
  }
  padded.push({...seg, padded_path: `audio/cosyvoice/${stem}_pad.wav`, slot_seconds: maxSeconds});
}

const concatList = padded
  .map((seg) => `file '${path.join(project, seg.padded_path).replaceAll("'", "'\\''")}'`)
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

const toSrt = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
};

const toAss = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
};

let cursor = 0;
const cues = padded.map((seg) => {
  const start = cursor;
  const speechEnd = start + seg.duration;
  const end = start + maxSeconds;
  cursor = end;
  return {...seg, start, speech_end: speechEnd, end};
});

// Phrase-split captions inside each clip for better on-screen pacing.
function splitCaption(text) {
  const parts = text
    .split(/(?<=[。？！；—…]|(?<![A-Za-z])[，、])/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length ? parts : [text];
}

const srtLines = [];
const assDialogues = [];
let srtIndex = 1;
for (const cue of cues) {
  const phrases = splitCaption(cue.caption);
  const speechDur = Math.max(0.8, cue.duration);
  const unit = speechDur / phrases.length;
  phrases.forEach((phrase, i) => {
    const start = cue.start + i * unit;
    const end = Math.min(cue.start + (i + 1) * unit, cue.speech_end + 0.05);
    srtLines.push(`${srtIndex++}\n${toSrt(start)} --> ${toSrt(end)}\n${phrase}\n`);
    assDialogues.push(
      `Dialogue: 0,${toAss(start)},${toAss(end)},Default,,0,0,0,,${phrase.replace(/\n/g, "\\N")}`,
    );
  });
}

writeFileSync(path.join(outDir, "captions.srt"), `${srtLines.join("\n")}\n`);
writeFileSync(
  path.join(project, "captions.ass"),
  `[Script Info]
Title: YesONO 3.0 MiniMax promo captions
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,PingFang SC,52,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,80,80,72,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${assDialogues.join("\n")}
`,
);

writeFileSync(
  path.join(outDir, "timings.json"),
  `${JSON.stringify(
    {
      provider: "cosyvoice",
      speaker,
      target_speed: targetSpeed,
      max_seconds: maxSeconds,
      total_duration: cursor,
      segments: cues,
    },
    null,
    2,
  )}\n`,
);

console.log(
  JSON.stringify(
    {
      total_duration: cursor,
      speaker,
      target_speed: targetSpeed,
      segments: cues.map(({id, duration, speed, start, end}) => ({
        id,
        duration,
        speed,
        start,
        end,
      })),
    },
    null,
    2,
  ),
);
