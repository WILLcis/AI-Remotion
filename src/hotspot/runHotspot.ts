import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { FlagKey } from "../../flags/feature-flags";
import { FLAGS } from "../../flags/feature-flags";
import {
  hotspotRequestSchema,
  hotspotResultSchema,
  type HotspotClip,
  type HotspotItem,
  type HotspotResult,
} from "../schemas/hotspot";
import { composeHotspotPack } from "./composeCopy";
import { formatHotspotMarkdown } from "./formatPack";
import type { PolishHotspotPack } from "./polishCopy";
import {
  enqueueScheduledHotspot,
  listDueScheduledHotspot,
  markScheduledHotspotDone,
  type ScheduledHotspotJob,
} from "./schedule";

export type HotspotFlagCheck = (key: FlagKey) => Promise<boolean>;

export type HotspotGenerateVideo = (input: {
  clip: HotspotClip;
  downloadDir: string;
}) => Promise<{ video_path: string; cover_path?: string }>;

export type HotspotPublishVideo = (input: {
  clip: HotspotClip;
  video_path: string;
  cover_path?: string;
}) => Promise<unknown>;

export type SearchHotspotItems = (
  topic: string,
  count: number,
) => Promise<HotspotItem[]>;

export type RunHotspotOptions = {
  isEnabled: HotspotFlagCheck;
  now?: Date;
  outDir: string;
  packOnly?: boolean;
  generateVideo?: HotspotGenerateVideo;
  publishVideo?: HotspotPublishVideo;
  scheduleDir?: string;
  jobId?: string;
  mode?: "auto" | "execute";
  polishPack?: PolishHotspotPack;
  searchItems?: SearchHotspotItems;
};

const clarification = (
  missing: string[],
  questions: string[],
): HotspotResult =>
  hotspotResultSchema.parse({
    status: "needs_clarification",
    pack_path: null,
    markdown: null,
    missing_fields: missing,
    questions,
    generated_videos: [],
    publish_results: [],
    next_action: questions.join(" "),
  });

export const missingHotspotFields = (
  input: Partial<{ format: string; topic: string }>,
): string[] => {
  const missing: string[] = [];
  if (!input.format) {
    missing.push("format");
  }
  if (!input.topic) {
    missing.push("topic");
  }
  return missing;
};

export const runHotspot = async (
  input: unknown,
  options: RunHotspotOptions,
): Promise<HotspotResult> => {
  const enabled = await options.isEnabled(FLAGS.VIDEO_HOTSPOT);
  if (!enabled) {
    return hotspotResultSchema.parse({
      status: "blocked",
      pack_path: null,
      markdown: null,
      missing_fields: [],
      questions: [],
      generated_videos: [],
      publish_results: [],
      next_action:
        'Hotspot digest is disabled. Set FLAG_video_hotspot=\'{"enabled":true}\' for an internal run.',
    });
  }

  const parsed = hotspotRequestSchema.safeParse(input);
  if (!parsed.success) {
    const missing = parsed.error.issues.map(
      (issue) => issue.path.join(".") || issue.message,
    );
    return clarification(missing, [
      "请指定热点类型 topic（例如 商业消费 / 科技 / 本地民生）。",
      "请指定文案类型 format：human-vo（真人口播，只出文案）或 digital-human（数字人口播，即梦出片并发布）。",
      "定时任务请给 schedule_at（一次）或 repeat=daily 且 daily_time=HH:mm。",
    ]);
  }

  const request = parsed.data;
  const now = options.now ?? new Date();
  const mode = options.mode ?? "auto";
  const futureOnce =
    Boolean(request.schedule_at) &&
    Date.parse(request.schedule_at ?? "") > now.getTime();
  if (mode !== "execute" && (request.repeat === "daily" || futureOnce)) {
    if (!options.scheduleDir) {
      return clarification(["scheduleDir"], [
        "Timed hotspot jobs need a schedule directory (default state/hotspot/scheduled).",
      ]);
    }
    const id =
      options.jobId ??
      `hotspot-${request.format}-${request.topic}-${now.getTime()}`;
    const filePath = enqueueScheduledHotspot(
      options.scheduleDir,
      { ...request, items: [] },
      id,
      now,
    );
    return hotspotResultSchema.parse({
      status: "scheduled",
      format: request.format,
      pack_path: filePath,
      markdown: null,
      missing_fields: [],
      questions: [],
      generated_videos: [],
      publish_results: [],
      next_action:
        "Queued. Run video:hotspot --due at/after the scheduled time. Agent must search the web again before generating copy.",
    });
  }

  if (request.items.length === 0) {
    return hotspotResultSchema.parse({
      status: "needs_search",
      format: request.format,
      pack_path: null,
      markdown: null,
      missing_fields: ["items"],
      questions: [
        `请先全网检索「${request.topic}」热点，把标题+摘要(+链接)写成 items JSON 后再跑。`,
      ],
      generated_videos: [],
      publish_results: [],
      next_action:
        "Search the public web for the requested topic, then rerun with items. Do not invent headlines.",
    });
  }

  const composed = composeHotspotPack(request, now);
  const pack = options.polishPack
    ? await options.polishPack(composed)
    : composed;
  const markdown = formatHotspotMarkdown(pack);
  mkdirSync(options.outDir, { recursive: true });
  const packPath = path.join(options.outDir, "hotspot-copy.md");
  writeFileSync(packPath, `${markdown}\n`, "utf8");
  writeFileSync(
    path.join(options.outDir, "hotspot-pack.json"),
    `${JSON.stringify(pack, null, 2)}\n`,
    "utf8",
  );

  if (request.format === "human-vo") {
    return hotspotResultSchema.parse({
      status: "done",
      format: "human-vo",
      pack_path: packPath,
      markdown,
      missing_fields: [],
      questions: [],
      generated_videos: [],
      publish_results: [],
      next_action:
        "Give the user hotspot-copy.md. They record the video themselves. Do not call Dreamina or publish.",
    });
  }

  const packOnly = options.packOnly || request.pack_only;
  const execute = request.execute_generation ?? !packOnly;
  if (!execute) {
    return hotspotResultSchema.parse({
      status: "done",
      format: "digital-human",
      pack_path: packPath,
      markdown,
      missing_fields: [],
      questions: [],
      generated_videos: [],
      publish_results: [],
      next_action:
        "Digital-human pack is ready. Next: Dreamina text2video then video:publish --platform all --generation-service dreamina.",
    });
  }

  if (!(await options.isEnabled(FLAGS.DREAMINA_MEDIA))) {
    return hotspotResultSchema.parse({
      status: "blocked",
      format: "digital-human",
      pack_path: packPath,
      markdown,
      missing_fields: [],
      questions: [],
      generated_videos: [],
      publish_results: [],
      next_action:
        'Digital-human copy is ready. Enable FLAG_dreamina_media to generate with Dreamina, then publish.',
    });
  }

  if (!options.generateVideo) {
    return hotspotResultSchema.parse({
      status: "blocked",
      format: "digital-human",
      pack_path: packPath,
      markdown,
      missing_fields: [],
      questions: [],
      generated_videos: [],
      publish_results: [],
      next_action:
        "Digital-human copy is ready but no Dreamina generator is wired.",
    });
  }

  const generatedVideos: string[] = [];
  const publishResults: unknown[] = [];
  const downloadDir = path.join(options.outDir, "renders");
  for (const clip of pack.clips) {
    const generated = await options.generateVideo({ clip, downloadDir });
    generatedVideos.push(generated.video_path);
    if (options.publishVideo) {
      publishResults.push(
        await options.publishVideo({
          clip,
          video_path: generated.video_path,
          cover_path: generated.cover_path,
        }),
      );
    }
  }

  return hotspotResultSchema.parse({
    status: "done",
    format: "digital-human",
    pack_path: packPath,
    markdown,
    missing_fields: [],
    questions: [],
    generated_videos: generatedVideos,
    publish_results: publishResults,
    next_action:
      "Dreamina videos generated and publish attempted (Douyin API + Weixin/XHS packs). Kill-switch flags still apply.",
  });
};

export const runDueScheduledHotspot = async (
  options: RunHotspotOptions & { scheduleDir: string },
): Promise<HotspotResult[]> => {
  const now = options.now ?? new Date();
  const due = listDueScheduledHotspot(options.scheduleDir, now);
  const results: HotspotResult[] = [];
  for (const job of due) {
    let request = job.request;
    if (request.items.length === 0 && options.searchItems) {
      const items = await options.searchItems(request.topic, request.count);
      request = { ...request, items };
    }
    const result = await runHotspot(request, {
      ...options,
      jobId: job.id,
      mode: "execute",
    });
    if (result.status === "needs_search") {
      if (options.searchItems) {
        markScheduledHotspotDone(options.scheduleDir, job, now);
      }
      results.push(result);
      continue;
    }
    if (result.status === "done" || result.status === "blocked") {
      markScheduledHotspotDone(options.scheduleDir, job, now);
    }
    results.push(result);
  }
  return results;
};

export const describeDueHotspotJobs = (
  jobs: ScheduledHotspotJob[],
): HotspotResult =>
  hotspotResultSchema.parse({
    status: "needs_search",
    pack_path: null,
    markdown: null,
    missing_fields: ["items"],
    questions: jobs.map(
      (job) =>
        `${job.id}: 检索「${job.request.topic}」并整理为 ${job.request.format}`,
    ),
    generated_videos: [],
    publish_results: jobs,
    next_action:
      "Search the web for each due job topic, then rerun with --run-id <id> --items <file>.",
  });
