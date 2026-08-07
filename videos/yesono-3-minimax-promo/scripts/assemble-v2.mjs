#!/usr/bin/env node
/**
 * Assemble MiniMax v2: group 3 H3 segs per clip, time-warp each trio to exact VO duration,
 * concat, mux CosyVoice, mux soft SRT captions.
 */
import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const timings = JSON.parse(
  readFileSync(path.join(project, "audio/cosyvoice/timings.json"), "utf8"),
);
const h3Dir = process.env.H3_SEGMENTS_DIR;
if (!h3Dir) throw new Error("H3_SEGMENTS_DIR required");

const renders = path.join(project, "renders");
const work = path.join(renders, "v2-work");
mkdirSync(work, {recursive: true});

const files = readdirSync(h3Dir)
  .filter((f) => /^seg_\d+\.mp4$/.test(f))
  .sort();
if (files.length !== 33) throw new Error(`need 33 segs, got ${files.length}`);

const voById = Object.fromEntries(timings.segments.map((s) => [s.id, s]));
const clipVideos = [];

for (let i = 0; i < 11; i++) {
  const clip = clips.clips[i];
  const vo = voById[clip.id];
  const trio = [files[i * 3], files[i * 3 + 1], files[i * 3 + 2]].map((f) =>
    path.join(h3Dir, f),
  );
  const list = path.join(work, `clip_${clip.id}_list.txt`);
  writeFileSync(list, `${trio.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n")}\n`);
  const concat = path.join(work, `clip_${clip.id}_raw.mp4`);
  execFileSync("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    "-an",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "14",
    "-preset",
    "medium",
    concat,
  ]);
  const dur = Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", concat],
      {encoding: "utf8"},
    ).trim(),
  );
  const target = vo.duration;
  const factor = dur / target; // setpts = PTS * (src/target) to compress/expand to target
  const fitted = path.join(work, `clip_${clip.id}.mp4`);
  execFileSync("ffmpeg", [
    "-y",
    "-i",
    concat,
    "-filter:v",
    `setpts=PTS*${factor}`,
    "-an",
    "-t",
    String(target),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-crf",
    "14",
    "-preset",
    "medium",
    fitted,
  ]);
  clipVideos.push(fitted);
  console.log(`clip ${clip.id}: video ${dur.toFixed(2)}s -> VO ${target.toFixed(2)}s`);
}

const allList = path.join(work, "all.txt");
writeFileSync(allList, `${clipVideos.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n")}\n`);
const silent = path.join(work, "video-silent.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  allList,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "14",
  "-preset",
  "medium",
  "-movflags",
  "+faststart",
  silent,
]);

const voice = path.join(project, "audio/cosyvoice/voiceover.wav");
// Rebuild voiceover without 15s padding — concat raw segs with tiny gaps matching timings
const rawList = path.join(work, "vo_raw.txt");
const rawSegs = timings.segments.map((s) => path.join(project, s.path));
writeFileSync(rawList, `${rawSegs.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n")}\n`);
const voExact = path.join(work, "vo_exact.wav");
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  rawList,
  "-c:a",
  "pcm_s16le",
  voExact,
]);

const mixed = path.join(renders, "yesono-3-minimax-v2-vo.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-i",
  silent,
  "-i",
  voExact,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  mixed,
]);

// Rebuild SRT from unpadded segment timings
const toSrt = (s) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const milli = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(milli).padStart(3, "0")}`;
};
function splitCaption(text) {
  return text
    .split(/(?<=[。？！；—…]|(?<![A-Za-z])[，、])/)
    .map((p) => p.trim())
    .filter(Boolean);
}
let cursor = 0;
const srt = [];
let idx = 1;
for (const seg of timings.segments) {
  const phrases = splitCaption(seg.caption);
  const unit = seg.duration / phrases.length;
  phrases.forEach((phrase, i) => {
    const start = cursor + i * unit;
    const end = cursor + (i + 1) * unit;
    srt.push(`${idx++}\n${toSrt(start)} --> ${toSrt(end)}\n${phrase}\n`);
  });
  cursor += seg.duration;
}
const srtPath = path.join(renders, "yesono-3-minimax-v2.srt");
writeFileSync(srtPath, `${srt.join("\n")}\n`);

const finalOut = path.join(renders, "yesono-3-minimax-v2-final.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-i",
  mixed,
  "-i",
  srtPath,
  "-map",
  "0:v",
  "-map",
  "0:a",
  "-map",
  "1:0",
  "-c:v",
  "copy",
  "-c:a",
  "copy",
  "-c:s",
  "mov_text",
  "-metadata:s:s:0",
  "language=chi",
  "-movflags",
  "+faststart",
  finalOut,
]);

console.log(finalOut);
console.log("duration_target", cursor);
