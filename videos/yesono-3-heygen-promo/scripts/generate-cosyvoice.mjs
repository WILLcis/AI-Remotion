import {execFileSync} from "node:child_process";
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const clips = JSON.parse(readFileSync(path.join(root, "..", "yesono-3-minimax-promo", "clips.json"), "utf8"));
const baseUrl = process.env.AI_REMOTION_TTS_BASE_URL || "http://127.0.0.1:8000";
const voiceDir = path.join(root, "assets", "voice", "cosyvoice");
const sampleRate = 24000;
const targetSeconds = 15;
const targetSpeechSeconds = 14.8;

const probeDuration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file], {encoding: "utf8"}).trim());
const atempo = (factor) => {
  const filters = [];
  let current = factor;
  while (current > 2) {
    filters.push("atempo=2");
    current /= 2;
  }
  filters.push(`atempo=${current.toFixed(4)}`);
  return filters.join(",");
};
const tokens = (text) => text.match(/[A-Za-z]+(?:\s+[A-Za-z]+)*|\d+(?:\.\d+)?|[\u4e00-\u9fff]{1,6}|[^\s]/g) || [];
const wordsFor = (text, duration) => {
  const parts = tokens(text);
  const weights = parts.map((part) => Math.max(1, [...part].filter((char) => /[\u4e00-\u9fff]/.test(char)).length + [...part].filter((char) => /[A-Za-z0-9]/.test(char)).length * .55));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = .05;
  return parts.map((text, index) => {
    const end = index === parts.length - 1 ? duration - .02 : Math.min(duration - .02, cursor + (duration - .1) * weights[index] / total);
    const word = {id: `w${index}`, text, start: Number(cursor.toFixed(3)), end: Number(end.toFixed(3))};
    cursor = end;
    return word;
  });
};

mkdirSync(voiceDir, {recursive: true});
const voices = [];
for (const [index, clip] of clips.clips.entries()) {
  const id = `${String(index + 1).padStart(2, "0")}-${["hook", "build-pain", "exchange-os", "tenant", "list-market", "outcome-cfd", "order-flow", "onchain", "liquidity", "revenue", "close"][index]}`;
  const raw = path.join(voiceDir, `${id}.raw.wav`);
  const output = path.join(voiceDir, `${id}.wav`);
  const response = await fetch(new URL("inference_sft", `${baseUrl.replace(/\/+$/, "")}/`), {method: "POST", body: new URLSearchParams({spk_id: "中文男", tts_text: clip.spoken})});
  if (!response.ok) throw new Error(`CosyVoice ${clip.id} HTTP ${response.status}`);
  const pcm = path.join(voiceDir, `${id}.pcm`);
  writeFileSync(pcm, Buffer.from(await response.arrayBuffer()));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", pcm, "-ar", "44100", "-ac", "1", raw]);
  const speed = probeDuration(raw) / targetSpeechSeconds;
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", raw, "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-filter_complex", `[0:a]${atempo(speed)}[speech];[speech][1:a]concat=n=2:v=0:a=1[a]`, "-map", "[a]", "-t", String(targetSeconds), output]);
  voices.push({id, path: path.relative(root, output), duration_s: targetSeconds, speech_duration_s: targetSpeechSeconds, speed: Number(speed.toFixed(3)), words: wordsFor(clip.caption, targetSpeechSeconds)});
}
writeFileSync(path.join(root, "audio_meta.json"), `${JSON.stringify({tts_provider: "cosyvoice", voice_id: "中文男", voices, total_duration_s: 165, delivery_note: "Local CosyVoice Mandarin male voice. Captions use weighted phrase timing over the final retimed local audio."}, null, 2)}\n`);
