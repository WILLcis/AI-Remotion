import {execFileSync} from "node:child_process";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const metaPath = path.join(root, "audio_meta.json");
const meta = JSON.parse(readFileSync(metaPath, "utf8"));
const targetSeconds = 15;

const getDuration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], {encoding: "utf8"}).trim());

for (const voice of meta.voices) {
  const source = path.join(root, "assets/voice", `${voice.id}.wav`);
  const ratio = getDuration(source) / targetSeconds;
  const output = path.join(root, "assets/voice/retimed", `${voice.id}.wav`);
  const needsTimestampScale = !voice.path.includes("retimed");
  mkdirSync(path.dirname(output), {recursive: true});
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", source, "-filter:a", `atempo=${ratio},atrim=duration=${targetSeconds}`, "-ar", "44100", "-ac", "1", output]);
  voice.path = path.relative(root, output);
  if (needsTimestampScale) voice.words = voice.words.map((word) => ({...word, start: Number((word.start / ratio).toFixed(3)), end: Number((word.end / ratio).toFixed(3))}));
  voice.duration_s = targetSeconds;
}

meta.total_duration_s = targetSeconds * meta.voices.length;
meta.delivery_note = "HeyGen Starfish outputs were deterministically tempo-adjusted to the approved 15-second scene duration; word timestamps were scaled by the same ratio.";
writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
