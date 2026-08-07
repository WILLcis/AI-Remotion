#!/usr/bin/env node
/**
 * Submit 11×15s MiniMax-H3 T2VA jobs from clips.json, poll, download segments.
 *
 * Requires:
 *   MINIMAX_API_KEY
 * Optional:
 *   MINIMAX_API_BASE (default https://api.minimaxi.com)
 *   MINIMAX_RESOLUTION (768P|2K, default 768P)
 */
import {mkdirSync, readFileSync, writeFileSync, existsSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));
const clips = JSON.parse(readFileSync(path.join(project, "clips.json"), "utf8"));
const apiKey = process.env.MINIMAX_API_KEY;
const base = (process.env.MINIMAX_API_BASE || "https://api.minimaxi.com").replace(/\/+$/, "");
const resolution = process.env.MINIMAX_RESOLUTION || "2K";
const duration = clips.seconds_per_clip;
const segmentsDir = path.join(project, "segments");
const statePath = path.join(project, "minimax-tasks.json");

if (!apiKey) {
  console.error("MINIMAX_API_KEY is required.");
  process.exit(2);
}

mkdirSync(segmentsDir, {recursive: true});

async function api(pathname, {method = "GET", body} = {}) {
  const response = await fetch(`${base}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`MiniMax ${pathname} non-JSON HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  if (!response.ok) {
    throw new Error(`MiniMax ${pathname} HTTP ${response.status}: ${text.slice(0, 800)}`);
  }
  return json;
}

function fullPrompt(clip) {
  return `${clips.style_prefix}\n${clip.prompt_body}`;
}

let state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {tasks: {}};

async function createTask(clip) {
  if (state.tasks[clip.id]?.task_id && state.tasks[clip.id]?.status !== "failed") {
    return state.tasks[clip.id];
  }
  const payload = {
    model: "MiniMax-H3",
    content: [{type: "text", text: fullPrompt(clip)}],
    resolution,
    duration,
    ratio: "16:9",
    aigc_watermark: false,
  };
  console.log(`create clip ${clip.id} …`);
  const created = await api("/v2/video_generation", {method: "POST", body: payload});
  const taskId = created.task_id || created.task?.id;
  if (!taskId) throw new Error(`No task_id for clip ${clip.id}: ${JSON.stringify(created)}`);
  state.tasks[clip.id] = {
    task_id: taskId,
    status: "queued",
    title: clip.title,
    created_at: new Date().toISOString(),
  };
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  return state.tasks[clip.id];
}

async function queryTask(taskId) {
  // Prefer V2 query path; fall back if platform uses query param form.
  try {
    return await api(`/v2/video_generation/${taskId}`);
  } catch (error) {
    return await api(`/v2/query/video_generation?task_id=${encodeURIComponent(taskId)}`);
  }
}

async function download(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download HTTP ${response.status} ${url}`);
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()));
}

for (const clip of clips.clips) {
  await createTask(clip);
}

const pending = () =>
  Object.entries(state.tasks).filter(([, t]) => !["succeeded", "failed", "cancelled"].includes(t.status));

while (pending().length) {
  for (const [id, task] of pending()) {
    const result = await queryTask(task.task_id);
    const info = result.task || result;
    const status = info.status || "unknown";
    state.tasks[id].status = status;
    state.tasks[id].raw = {
      status,
      duration: info.duration,
      ratio: info.ratio,
      resolution: info.resolution,
    };
    if (status === "succeeded") {
      const url = info.content?.url || info.file_url || info.video_url;
      if (!url) throw new Error(`clip ${id} succeeded without url`);
      const dest = path.join(segmentsDir, `clip_${id}.mp4`);
      console.log(`download clip ${id} → ${dest}`);
      await download(url, dest);
      state.tasks[id].path = dest;
      state.tasks[id].url = url;
    } else if (status === "failed" || status === "cancelled") {
      state.tasks[id].error = info;
      console.error(`clip ${id} ${status}`, JSON.stringify(info).slice(0, 400));
    } else {
      console.log(`clip ${id} ${status}`);
    }
    writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
  }
  if (pending().length) await new Promise((r) => setTimeout(r, 15000));
}

const failed = Object.entries(state.tasks).filter(([, t]) => t.status !== "succeeded");
if (failed.length) {
  console.error("Failed clips:", failed.map(([id]) => id).join(", "));
  process.exit(1);
}
console.log("All MiniMax segments ready in", segmentsDir);
