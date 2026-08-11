#!/usr/bin/env node
/**
 * Fix Clip01 opening: CosyVoice often says 试想/设想 instead of 想.
 * Speak a discard cue ("开始。") then keep audio after the first silence.
 * Rebuild voiceover from phrase WAVs and remux is done by shell after.
 */
import {execFileSync} from "node:child_process";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  cosyVoice3ZeroShotPcm,
  requireCosyVoice3Config,
} from "../../../scripts/cosyvoice3-client.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "audio");
const partsDir = path.join(outDir, "phrases");
mkdirSync(partsDir, {recursive: true});
const cv3 = requireCosyVoice3Config();

function probe(file) {
  return Number(
    execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      {encoding: "utf8"},
    ).trim(),
  );
}

function pcmToWav(pcm, wav) {
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
    pcm,
    "-ar",
    "48000",
    "-ac",
    "1",
    wav,
  ]);
}

function silenceLog(wav) {
  try {
    execFileSync(
      "ffmpeg",
      ["-i", wav, "-af", "silencedetect=noise=-35dB:d=0.08", "-f", "null", "-"],
      {encoding: "utf8"},
    );
    return "";
  } catch (error) {
    return (error.stderr && error.stderr.toString()) || "";
  }
}

async function ttsOpening() {
  const outWav = path.join(partsDir, "p00.wav");
  const pcm = path.join(partsDir, "p00_raw.pcm");
  const raw = path.join(partsDir, "p00_raw.wav");
  // Discard cue avoids onset blend into 试想/设想
  const buf = await cosyVoice3ZeroShotPcm("开始。想开一家交易所？", cv3);
  writeFileSync(pcm, buf);
  pcmToWav(pcm, raw);
  const log = silenceLog(raw);
  const ends = [...log.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => Number(m[1]));
  console.log("silence_end", ends);
  let cut = ends.find((t) => t >= 0.25 && t < probe(raw) * 0.75);
  if (cut == null) cut = Math.min(0.9, probe(raw) * 0.35);
  cut = Math.max(0, cut - 0.02);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(cut), "-i", raw, "-c", "copy", outWav]);
  console.log(`opening cut@${cut.toFixed(3)} → ${probe(outWav).toFixed(3)}s`);
  return outWav;
}

function gapMsFor(chunk) {
  if (/[？！。]$/.test(chunk)) return 200;
  if (/——$/.test(chunk) || /：$/.test(chunk)) return 150;
  if (/[，；]$/.test(chunk)) return 150;
  if (/、$/.test(chunk)) return 90;
  return 90;
}

const meta = JSON.parse(readFileSync(path.join(root, "audio_meta.json"), "utf8"));
const phrases = [...meta.phrases];
phrases[0] = "想开一家交易所？";

await ttsOpening();

const wavParts = [];
for (let i = 0; i < phrases.length; i++) {
  const wav = path.join(partsDir, `p${String(i).padStart(2, "0")}.wav`);
  if (!existsSync(wav)) throw new Error(`missing ${wav}`);
  wavParts.push(wav);
  if (i < phrases.length - 1) {
    const g = path.join(partsDir, `g${String(i).padStart(2, "0")}.wav`);
    execFileSync("ffmpeg", [
      "-y",
      "-v",
      "error",
      "-f",
      "lavfi",
      "-i",
      "anullsrc=r=48000:cl=mono",
      "-t",
      (gapMsFor(phrases[i]) / 1000).toFixed(3),
      g,
    ]);
    wavParts.push(g);
  }
}

const list = path.join(partsDir, "concat.txt");
writeFileSync(list, wavParts.map((f) => `file '${path.resolve(f)}'`).join("\n") + "\n");
const rawAll = path.join(outDir, "clip01_phrased_raw.wav");
const out = path.join(outDir, "clip01_voiceover.wav");
execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", rawAll]);
execFileSync("ffmpeg", [
  "-y",
  "-v",
  "error",
  "-i",
  rawAll,
  "-af",
  "highpass=f=70,lowpass=f=11000,acompressor=threshold=-18dB:ratio=2.5:attack=15:release=120:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=11",
  "-ar",
  "48000",
  "-ac",
  "1",
  out,
]);

meta.phrases = phrases;
meta.duration = probe(out);
meta.note = "Opening discard-prefix trim avoids 试想/设想; comma breaths retained";
writeFileSync(path.join(root, "audio_meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log("FINAL", meta.duration.toFixed(3));
