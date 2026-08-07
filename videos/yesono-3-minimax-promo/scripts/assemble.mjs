#!/usr/bin/env node
/**
 * After H3 finishes 33×5s segments, group into 11×15s clip_XX.mp4 then
 * mix CosyVoice + burn ASS.
 */
import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const segmentsDir = path.join(project, "segments");
const rendersDir = path.join(project, "renders");
const voice = path.join(project, "audio/cosyvoice/voiceover.wav");
const ass = path.join(project, "captions.ass");
mkdirSync(rendersDir, {recursive: true});
mkdirSync(segmentsDir, {recursive: true});

const h3SegDir = process.env.H3_SEGMENTS_DIR;
if (h3SegDir) {
  const files = readdirSync(h3SegDir)
    .filter((f) => /^seg_\d+\.mp4$/.test(f))
    .sort();
  if (files.length !== 33) {
    throw new Error(`Expected 33 H3 segments in ${h3SegDir}, found ${files.length}`);
  }
  for (let i = 0; i < 11; i++) {
    const list = path.join(rendersDir, `clip_${String(i + 1).padStart(2, "0")}_concat.txt`);
    const trio = [files[i * 3], files[i * 3 + 1], files[i * 3 + 2]].map((f) =>
      path.join(h3SegDir, f),
    );
    writeFileSync(list, `${trio.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n")}\n`);
    const out = path.join(segmentsDir, `clip_${String(i + 1).padStart(2, "0")}.mp4`);
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
      "slow",
      "-movflags",
      "+faststart",
      out,
    ]);
  }
}

const segmentPaths = clips.clips.map((c) => path.join(segmentsDir, `clip_${c.id}.mp4`));
for (const p of segmentPaths) {
  if (!existsSync(p)) throw new Error(`Missing segment: ${p}`);
}
if (!existsSync(voice)) throw new Error(`Missing voiceover: ${voice}`);
if (!existsSync(ass)) throw new Error(`Missing captions: ${ass}`);

const listPath = path.join(rendersDir, "concat.txt");
writeFileSync(
  listPath,
  `${segmentPaths.map((p) => `file '${p.replaceAll("'", "'\\''")}'`).join("\n")}\n`,
);

const silentVideo = path.join(rendersDir, "video-silent.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-f",
  "concat",
  "-safe",
  "0",
  "-i",
  listPath,
  "-an",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "14",
  "-preset",
  "slow",
  "-movflags",
  "+faststart",
  silentVideo,
]);

const mixed = path.join(rendersDir, "video-vo.mp4");
execFileSync("ffmpeg", [
  "-y",
  "-i",
  silentVideo,
  "-i",
  voice,
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

const finalOut = path.join(rendersDir, "yesono-3-minimax-final.mp4");
const assEscaped = ass.replaceAll("\\", "\\\\").replaceAll(":", "\\:").replaceAll("'", "\\'");
execFileSync("ffmpeg", [
  "-y",
  "-i",
  mixed,
  "-vf",
  `ass=${assEscaped}`,
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "14",
  "-preset",
  "slow",
  "-c:a",
  "copy",
  "-movflags",
  "+faststart",
  finalOut,
]);

console.log(finalOut);
