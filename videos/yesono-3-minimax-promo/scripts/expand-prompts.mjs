#!/usr/bin/env node
/**
 * Expand each 15s MiniMax clip into 3×5s H3 segments (VRAM-safe at 1344×768),
 * keeping maximum clarity settings proven on cornerstone 5090.
 */
import {mkdirSync, readFileSync, writeFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const repo = path.resolve(project, "../..");
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const promptsDir = path.join(project, "prompts");
mkdirSync(promptsDir, {recursive: true});

const QUALITY =
  "最高清晰度、超高清、锐利对焦、文字边缘干净无糊字、无压缩块状伪影；ultra sharp maximum clarity photoreal fintech product film, 1344x768 native.";

function parseShots(promptBody) {
  const lines = promptBody
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const shots = lines.filter((l) => /^镜头\d/.test(l));
  const rhythm = lines.find((l) => l.startsWith("节奏：")) || "";
  return {shots, rhythm};
}

function windowsFor(shots) {
  // Pack 4 storyboard shots into 3×5s windows while preserving narrative order.
  if (shots.length >= 4) {
    return [
      {label: "0-5s", shotText: [shots[0], shots[1]].join(" ")},
      {label: "5-10s", shotText: [shots[2]].join(" ")},
      {label: "10-15s", shotText: [shots[3]].join(" ")},
    ];
  }
  return shots.map((s, i) => ({label: `${i * 5}-${i * 5 + 5}s`, shotText: s}));
}

const segments = [];
let seed = 904100;

for (const clip of clips.clips) {
  const fullPromptPath = path.join(promptsDir, `clip_${clip.id}.txt`);
  const fullPrompt = `${clips.style_prefix}\n${clip.prompt_body}`;
  writeFileSync(fullPromptPath, `${fullPrompt}\n`);

  const {shots, rhythm} = parseShots(clip.prompt_body);
  const windows = windowsFor(shots);

  windows.forEach((win, wi) => {
    const prompt = [
      clips.style_prefix,
      QUALITY,
      `这是 YesONO 3.0 宣传片 Clip ${clip.id}「${clip.title}」的第 ${wi + 1}/3 段（对应全片该条内 ${win.label}）。保持与同系列其他段统一的暗夜藏青/金铜/冷港蓝视觉系统。`,
      `本段画面内容：${win.shotText}`,
      rhythm,
      "无旁白人声，仅允许极低频电子氛围与短促 UI 音效。硬切或极快闪白转场。",
    ].join("\n");

    segments.push({
      seconds: 5,
      seed: seed++,
      caption: wi === 0 ? clip.caption : "",
      clip_id: clip.id,
      title: clip.title,
      part: wi + 1,
      prompt,
    });
  });
}

const job = {
  id: "yesono_promo_11x15_minimax_hq",
  width: 1344,
  height: 768,
  steps: 24,
  // Independent 5s shots avoid cross-clip bleed; global style prefix keeps look locked.
  continuity_first_frame: false,
  notes:
    "Each logical 15s clip is 3×5s @1344x768 steps=24 (max stable HQ on 5090 for longform). Style prefix enforces clarity/brand lock.",
  segments,
};

const jobPath = path.join(repo, "scripts/h3-longform", `${job.id}.json`);
writeFileSync(jobPath, `${JSON.stringify(job, null, 2)}\n`);
writeFileSync(
  path.join(repo, "scripts/h3-longform", "yesono_promo_11x15_minimax.json"),
  `${JSON.stringify(job, null, 2)}\n`,
);

console.log(
  JSON.stringify(
    {
      job_path: jobPath,
      logical_clips: clips.clips.length,
      render_segments: segments.length,
      width: job.width,
      height: job.height,
      steps: job.steps,
    },
    null,
    2,
  ),
);
