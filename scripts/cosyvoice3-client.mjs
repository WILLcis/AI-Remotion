/**
 * Shared CosyVoice 3 zero-shot helpers for promo generate scripts.
 * Requires AI_REMOTION_TTS_BASE_URL (cornerstone Tailscale).
 */
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

export function loadEnvLocal() {
  try {
    for (const line of readFileSync(path.join(repoRoot, ".env.local"), "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m || process.env[m[1]]) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* optional */
  }
}

export function requireCosyVoice3Config() {
  loadEnvLocal();
  const baseUrl = process.env.AI_REMOTION_TTS_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      "AI_REMOTION_TTS_BASE_URL is required (e.g. http://100.125.33.44:8000 for CosyVoice 3 on cornerstone).",
    );
  }
  const referenceAudioPath =
    process.env.AI_REMOTION_TTS_REFERENCE_AUDIO ||
    path.join(repoRoot, "assets/tts/cosyvoice3-zh-male-ref.wav");
  const referenceTextPath =
    process.env.AI_REMOTION_TTS_REFERENCE_TEXT_FILE ||
    path.join(repoRoot, "assets/tts/cosyvoice3-zh-male-ref.txt");
  const referenceText =
    process.env.AI_REMOTION_TTS_REFERENCE_TEXT ||
    readFileSync(referenceTextPath, "utf8").trim();
  if (!referenceText) {
    throw new Error("CosyVoice 3 reference transcript is empty.");
  }
  return {baseUrl, referenceAudioPath, referenceText};
}

export async function cosyVoice3ZeroShotPcm(text, {baseUrl, referenceAudioPath, referenceText, timeoutMs = 300_000}) {
  const form = new FormData();
  form.set("tts_text", text);
  form.set("prompt_text", referenceText);
  form.set(
    "prompt_wav",
    new Blob([readFileSync(referenceAudioPath)], {type: "audio/wav"}),
    path.basename(referenceAudioPath),
  );
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      new URL("inference_zero_shot", `${baseUrl.replace(/\/+$/, "")}/`),
      {method: "POST", body: form, signal: controller.signal},
    );
    if (!response.ok) {
      throw new Error(`CosyVoice 3 HTTP ${response.status} for «${text.slice(0, 24)}»`);
    }
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.length < 1024) {
      throw new Error(`CosyVoice 3 empty/short PCM (${buf.length} bytes)`);
    }
    return buf;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`CosyVoice 3 timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
