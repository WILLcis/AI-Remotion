#!/usr/bin/env node
/**
 * CosyVoice VO with sentence-level TTS + short silence gaps (less AI mush).
 * Mild atempo (~1.10); only stretch further if over clip budget.
 */
import {execFileSync} from "node:child_process";
import {mkdirSync, readFileSync, rmSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  cosyVoice3ZeroShotPcm,
  requireCosyVoice3Config,
} from "../../../scripts/cosyvoice3-client.mjs";

const project = fileURLToPath(new URL("..", import.meta.url));
const cv3 = requireCosyVoice3Config();
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const outDir = path.join(project, "audio", "cosyvoice");
const targetSpeed = Number(clips.voice.speed || 1.05);
const gapMs = Number(clips.voice.sentence_gap_ms || 120);
const maxSeconds = Number(clips.seconds_per_clip || 22);
const maxAtempo = Number(clips.voice.max_atempo || 1.2);

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

function splitSentences(text) {
  // Pause on sentence enders; also break very long clauses on commas.
  const parts = text
    .split(/(?<=[。！？；])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [];
  for (const p of parts) {
    if (p.length > 42) {
      const chunks = p
        .split(/(?<=[，、：])/)
        .map((s) => s.trim())
        .filter(Boolean);
      let buf = "";
      for (const c of chunks) {
        if ((buf + c).length > 42 && buf) {
          merged.push(buf);
          buf = c;
        } else {
          buf += c;
        }
      }
      if (buf) merged.push(buf);
      continue;
    }
    if (merged.length && (merged[merged.length - 1].length < 8 || p.length < 4)) {
      merged[merged.length - 1] += p;
    } else {
      merged.push(p);
    }
  }
  return merged.length ? merged : [text];
}

async function ttsToWav(text, wavPath, speed, attempt = 1) {
  const pcmPath = wavPath.replace(/\.wav$/, ".pcm");
  try {
    const buf = await cosyVoice3ZeroShotPcm(text, cv3);
    writeFileSync(pcmPath, buf);
  } catch (error) {
    if (attempt < 4) {
      const wait = attempt * 2500;
      console.warn(`retry ${attempt}/3 after ${(error && error.message) || error} …`);
      await new Promise((r) => setTimeout(r, wait));
      return ttsToWav(text, wavPath, speed, attempt + 1);
    }
    throw error;
  }
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
    atempoChain(speed),
    "-ar",
    "48000",
    "-ac",
    "1",
    wavPath,
  ]);
}

const silence = path.join(outDir, "silence.wav");
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-f",
  "lavfi",
  "-i",
  `anullsrc=r=48000:cl=mono`,
  "-t",
  (gapMs / 1000).toFixed(3),
  silence,
]);

const segments = [];

for (const [index, clip] of clips.clips.entries()) {
  const stem = `seg_${String(index).padStart(2, "0")}`;
  const sentences = splitSentences(clip.spoken);
  const parts = [];
  process.stdout.write(`CosyVoice ${clip.id}/11 (${sentences.length} parts) … `);

  for (const [si, sentence] of sentences.entries()) {
    const partWav = path.join(outDir, `${stem}_p${String(si).padStart(2, "0")}.wav`);
    await ttsToWav(sentence, partWav, targetSpeed);
    parts.push(partWav);
    if (si < sentences.length - 1) parts.push(silence);
  }

  const listFile = path.join(outDir, `${stem}_concat.txt`);
  writeFileSync(
    listFile,
    parts.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n",
  );
  const rawWav = path.join(outDir, `${stem}_raw.wav`);
  const wavPath = path.join(outDir, `${stem}.wav`);
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c",
    "copy",
    rawWav,
  ]);

  let duration = probeDuration(rawWav);
  let appliedSpeed = targetSpeed;
  if (duration > maxSeconds - 0.12) {
    // Soft cap: never chipmunk past maxAtempo total relative to already-applied targetSpeed.
    const needed = duration / (maxSeconds - 0.18);
    const extra = Math.min(needed, maxAtempo / Math.max(targetSpeed, 0.01));
    if (extra > 1.01) {
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
    sentences: sentences.length,
  });
}

const gap = 0.08;
let t = 0;
const timeline = segments.map((seg, i) => {
  const start = t;
  const sceneDur = seg.duration + (i < segments.length - 1 ? gap : 0);
  t += sceneDur;
  return {...seg, start, scene_duration: sceneDur};
});

writeFileSync(path.join(outDir, "timings.json"), JSON.stringify({segments: timeline, total: t}, null, 2));

const concatList = path.join(outDir, "concat.txt");
writeFileSync(
  concatList,
  timeline
    .flatMap((seg, i) => {
      const lines = [`file '${path.join(outDir, path.basename(seg.path))}'`];
      if (i < timeline.length - 1) {
        const g = path.join(outDir, "gap.wav");
        if (i === 0) {
          execFileSync("ffmpeg", [
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=48000:cl=mono",
            "-t",
            String(gap),
            g,
          ]);
        }
        lines.push(`file '${g}'`);
      }
      return lines;
    })
    .join("\n") + "\n",
);
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  concatList,
  "-c",
  "copy",
  path.join(outDir, "voiceover.wav"),
]);

writeFileSync(
  path.join(project, "audio_meta.json"),
  JSON.stringify(
    {
      provider: "cosyvoice-clone",
      model: "Fun-CosyVoice3-0.5B-2512",
      base_url: cv3.baseUrl,
      speaker: clips.voice.speaker || "中文男",
      speed: targetSpeed,
      sentence_gap_ms: gapMs,
      sample_rate_in: 24000,
      mix: "single-voiceover",
      voiceover: "audio/cosyvoice/voiceover.wav",
      total_duration: t,
      segments: timeline,
    },
    null,
    2,
  ) + "\n",
);

console.log(`TOTAL ${t.toFixed(2)}s → audio_meta.json`);
