import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { flags, FLAGS, type FlagKey } from "../../flags/feature-flags";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import {
  buildDreaminaVideoPrompt,
  estimateSpokenDurationSeconds,
} from "../hotspot/composeCopy";
import { generateDreaminaCover } from "../hotspot/cover";
import {
  crawlHotspotItems,
  DEFAULT_HOTSPOT_CRAWLER_CONFIG,
  hotspotCrawlerConfigSchema,
  type HotspotCrawlerConfig,
} from "../hotspot/crawl";
import { createLlmPolishPack } from "../hotspot/polishCopy";
import {
  describeDueHotspotJobs,
  runDueScheduledHotspot,
  runHotspot,
} from "../hotspot/runHotspot";
import { listDueScheduledHotspot, listScheduledHotspot, markScheduledHotspotDone } from "../hotspot/schedule";
import { watchHotspot } from "../hotspot/watch";
import {
  DEFAULT_DREAMINA_VIDEO_MODEL,
  dreaminaQueryResult,
  dreaminaText2Video,
  parseDreaminaSubmitId,
} from "../media/dreaminaCli";
import { runPublish } from "../publish/runPublish";
import { resolvePublishPlatforms } from "../publish/schema";
import {
  hotspotItemSchema,
  type HotspotClip,
} from "../schemas/hotspot";

const usage = `Usage:
  npm run video:hotspot -- --format <human-vo|digital-human> --topic <热点类型> --items <json> --out <dir>
  npm run video:hotspot -- --format <...> --topic <...> --repeat daily --daily-time HH:mm
  npm run video:hotspot -- --format <...> --topic <...> --schedule-at <ISO-8601>
  npm run video:hotspot -- --due
  npm run video:hotspot -- --watch [--format <...> --topic <...> --repeat daily --daily-time HH:mm]
  npm run video:hotspot -- --crawl --topic <热点类型>
  npm run video:hotspot -- --run-id <id> --items <json> --out <dir>

human-vo: 真人口播，只写文案，不生成视频。LLM 精修爆款标题/封面/标签/口播。
digital-human: 同上 + 即梦提示词，然后 Dreamina text2video（默认 seedance2.0_vip）+ text2image 封面，并发布 Pack。抖音 live API 暂停时 --platform all 会跳过抖音。
--watch 常驻：到期任务走仓库 RSS 爬虫，再 LLM 精修。不要编造热点。
--pack-only 只出文案，不调用即梦。
`;

const getFlagValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const loadItems = (filePath: string) => {
  const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  const list = Array.isArray(raw) ? raw : (raw as { items?: unknown }).items;
  return hotspotItemSchema.array().parse(list);
};

const loadCrawlerConfig = (cwd: string, configPath?: string): HotspotCrawlerConfig => {
  const resolved =
    configPath ??
    (existsSync(path.join(cwd, "config/hotspot-crawler.local.json"))
      ? path.join(cwd, "config/hotspot-crawler.local.json")
      : existsSync(path.join(cwd, "config/hotspot-crawler.example.json"))
        ? path.join(cwd, "config/hotspot-crawler.example.json")
        : undefined);
  if (!resolved) {
    return DEFAULT_HOTSPOT_CRAWLER_CONFIG;
  }
  return hotspotCrawlerConfigSchema.parse(
    JSON.parse(readFileSync(resolved, "utf8")) as unknown,
  );
};

const latestMp4 = (dir: string): string | undefined => {
  mkdirSync(dir, { recursive: true });
  const files = readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".mp4"))
    .map((name) => path.join(dir, name));
  return files.at(-1);
};

const createDreaminaGenerator = () => {
  return async ({
    clip,
    downloadDir,
  }: {
    clip: HotspotClip;
    downloadDir: string;
  }) => {
    const clipDir = path.join(downloadDir, `clip-${String(clip.index).padStart(2, "0")}`);
    mkdirSync(clipDir, { recursive: true });
    const result = await dreaminaText2Video({
      approvePaid: true,
      prompt: buildDreaminaVideoPrompt(clip),
      durationSeconds: estimateSpokenDurationSeconds(clip.spoken),
      pollSeconds: 600,
      ratio: "9:16",
      videoResolution: "720p",
      modelVersion: DEFAULT_DREAMINA_VIDEO_MODEL,
    });
    const submitId = parseDreaminaSubmitId(result.stdout);
    if (!submitId) {
      throw new Error(
        `Dreamina text2video produced no submit_id for clip ${clip.index}. ${result.stdout} ${result.stderr}`,
      );
    }
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await dreaminaQueryResult({ submitId, downloadDir: clipDir });
      const videoPath = latestMp4(clipDir);
      if (videoPath) {
        const coverPath = await generateDreaminaCover({
          clip,
          downloadDir: path.join(clipDir, "cover"),
          approvePaid: true,
        });
        return { video_path: videoPath, cover_path: coverPath };
      }
      await new Promise((resolve) => setTimeout(resolve, 20_000));
    }
    throw new Error(
      `Dreamina text2video produced no mp4 for clip ${clip.index} after waiting. ${result.stdout} ${result.stderr}`,
    );
  };
};

const createPublisher = (auditPath: string, packDir: string) => {
  const isEnabled = (key: FlagKey) =>
    flags.isEnabled(key, { isTeamMember: true });
  return async ({
    clip,
    video_path,
    cover_path,
  }: {
    clip: HotspotClip;
    video_path: string;
    cover_path?: string;
  }) => {
    const results = [];
    const skipDouyin =
      (await isEnabled(FLAGS.VIDEO_PUBLISH)) &&
      !(await isEnabled(FLAGS.VIDEO_PUBLISH_DOUYIN));
    for (const platform of resolvePublishPlatforms("all", { skipDouyin })) {
      results.push(
        await runPublish(
          {
            platform,
            video_path,
            cover_path,
            title: clip.hook_title,
            caption: clip.spoken,
            topics: clip.tags.split(/\s+/).filter(Boolean),
            account_alias: "default",
            schedule_at: null,
            approve_publish: true,
          },
          {
            auditPath,
            isEnabled,
            packDir,
            scheduleDir: path.join(path.dirname(auditPath), "scheduled"),
          },
        ),
      );
    }
    return results;
  };
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage.trim());
    return;
  }

  const cwd = process.cwd();
  const isEnabled = (key: FlagKey) =>
    flags.isEnabled(key, { isTeamMember: true });
  const scheduleDir = path.resolve(
    getFlagValue(args, "--schedule-dir") ??
      path.join(cwd, "state/hotspot/scheduled"),
  );
  const outDir = path.resolve(
    getFlagValue(args, "--out") ?? path.join(cwd, "videos/hotspot-latest"),
  );
  const packOnly = args.includes("--pack-only");
  const itemsPath = getFlagValue(args, "--items");
  const items = itemsPath ? loadItems(path.resolve(itemsPath)) : [];
  const crawlerConfig = loadCrawlerConfig(cwd, getFlagValue(args, "--crawler-config"));
  const polishPack = createLlmPolishPack({ config: loadRuntimeConfig().llm });
  const searchItems = (topic: string, count: number) =>
    crawlHotspotItems({
      topic,
      count,
      config: crawlerConfig,
    });
  const generateVideo = packOnly ? undefined : createDreaminaGenerator();
  const publishVideo = packOnly
    ? undefined
    : createPublisher(
        path.join(cwd, "state/publish/audit.jsonl"),
        path.join(outDir, "publish-pack"),
      );

  if (args.includes("--crawl")) {
    const topic = getFlagValue(args, "--topic");
    if (!topic) {
      throw new Error(usage);
    }
    const crawled = await searchItems(
      topic,
      Number(getFlagValue(args, "--count") ?? "3"),
    );
    console.log(JSON.stringify({ topic, items: crawled }, null, 2));
    if (crawled.length === 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (args.includes("--watch")) {
    const formatRaw = getFlagValue(args, "--format");
    const topic = getFlagValue(args, "--topic");
    const dailyTime = getFlagValue(args, "--daily-time");
    if (formatRaw && topic) {
      const alreadyQueued = listScheduledHotspot(scheduleDir).some(
        (job) =>
          job.request.format === formatRaw &&
          job.request.topic === topic &&
          job.request.repeat === "daily",
      );
      if (!alreadyQueued) {
        await runHotspot(
          {
            format: formatRaw,
            topic,
            items: [],
            count: Number(getFlagValue(args, "--count") ?? "3"),
            schedule_at: null,
            repeat: getFlagValue(args, "--repeat") ?? "daily",
            ...(dailyTime ? { daily_time: dailyTime } : { daily_time: "08:00" }),
            pack_only: packOnly,
          },
          {
            isEnabled,
            outDir,
            packOnly,
            scheduleDir,
          },
        );
      }
    }
    await watchHotspot({
      isEnabled,
      scheduleDir,
      outDir,
      packOnly,
      searchItems,
      polishPack,
      generateVideo,
      publishVideo,
      pollMs: Number(getFlagValue(args, "--poll-ms") ?? "60000"),
    });
    return;
  }

  if (args.includes("--due")) {
    const due = listDueScheduledHotspot(scheduleDir);
    if (due.length === 0) {
      console.log(JSON.stringify({ results: [] }, null, 2));
      return;
    }
    const crawlerOn = await isEnabled(FLAGS.VIDEO_HOTSPOT_CRAWLER);
    if (!crawlerOn && due.every((job) => job.request.items.length === 0) && items.length === 0) {
      console.log(JSON.stringify(describeDueHotspotJobs(due), null, 2));
      return;
    }
    const results = await runDueScheduledHotspot({
      isEnabled,
      outDir,
      packOnly,
      scheduleDir,
      polishPack,
      searchItems: crawlerOn ? searchItems : undefined,
      generateVideo,
      publishVideo,
    });
    console.log(JSON.stringify({ results }, null, 2));
    return;
  }

  const runId = getFlagValue(args, "--run-id");
  if (runId) {
    const job = listScheduledHotspot(scheduleDir).find((entry) => entry.id === runId);
    if (!job) {
      throw new Error(`Unknown hotspot schedule id: ${runId}`);
    }
    const result = await runHotspot(
      {
        ...job.request,
        items,
        schedule_at: null,
        repeat: "none",
        pack_only: packOnly,
      },
      {
        isEnabled,
        outDir,
        packOnly,
        scheduleDir,
        mode: "execute",
        polishPack,
        generateVideo,
        publishVideo,
      },
    );
    if (result.status === "done") {
      markScheduledHotspotDone(scheduleDir, job);
    }
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const formatRaw = getFlagValue(args, "--format");
  const topic = getFlagValue(args, "--topic");
  const presenterPrompt = getFlagValue(args, "--presenter-prompt");
  const dailyTime = getFlagValue(args, "--daily-time");
  const dateLabel = getFlagValue(args, "--date");
  const request = {
    format: formatRaw,
    topic,
    items,
    count: Number(getFlagValue(args, "--count") ?? "3"),
    ...(presenterPrompt ? { presenter_prompt: presenterPrompt } : {}),
    ...(dateLabel ? { date: dateLabel } : {}),
    schedule_at: getFlagValue(args, "--schedule-at") ?? null,
    repeat: getFlagValue(args, "--repeat") ?? "none",
    ...(dailyTime ? { daily_time: dailyTime } : {}),
    pack_only: packOnly,
  };

  const result = await runHotspot(request, {
    isEnabled,
    outDir,
    packOnly,
    scheduleDir,
    polishPack,
    generateVideo,
    publishVideo,
  });
  console.log(JSON.stringify(result, null, 2));
  if (
    result.status === "blocked" ||
    result.status === "failed" ||
    result.status === "needs_clarification" ||
    result.status === "needs_search"
  ) {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
