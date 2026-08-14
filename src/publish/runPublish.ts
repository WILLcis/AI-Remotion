import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { FlagKey } from "../../flags/feature-flags";
import { FLAGS } from "../../flags/feature-flags";
import { writePublishAudit } from "./audit";
import {
  composeDouyinText,
  createHttpDouyinClient,
  loadDouyinCredentials,
  type DouyinClient,
} from "./douyin";
import { writePublishPack } from "./publishPack";
import {
  publishRequestSchema,
  type PublishPlatform,
  type PublishRequest,
  type PublishResult,
} from "./schema";
import {
  enqueueScheduledPublish,
  listDueScheduledPublish,
  markScheduledPublishDone,
} from "./schedule";

export type PublishFlagCheck = (key: FlagKey) => Promise<boolean>;

export type RunPublishOptions = {
  auditPath: string;
  douyin?: DouyinClient;
  env?: NodeJS.ProcessEnv;
  isEnabled: PublishFlagCheck;
  now?: Date;
  packDir?: string;
  scheduleDir: string;
};

const platformFlag = (platform: PublishPlatform): FlagKey => {
  if (platform === "douyin") {
    return FLAGS.VIDEO_PUBLISH_DOUYIN;
  }
  if (platform === "weixin-channels") {
    return FLAGS.VIDEO_PUBLISH_WEIXIN_CHANNELS;
  }
  return FLAGS.VIDEO_PUBLISH_XIAOHONGSHU;
};

const hashFile = (filePath: string): string =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

const blocked = (
  request: PublishRequest,
  videoSha256: string,
  message: string,
): PublishResult => ({
  status: "blocked",
  platform: request.platform,
  video_path: request.video_path,
  video_sha256: videoSha256,
  account_alias: request.account_alias,
  title: request.title,
  schedule_at: request.schedule_at ?? null,
  platform_post_id: null,
  pack_path: null,
  error_code: "blocked",
  message,
});

const assertVideoFile = (videoPath: string): void => {
  if (!existsSync(videoPath) || !statSync(videoPath).isFile()) {
    throw new Error(`Publish video is missing: ${videoPath}`);
  }
};

export const runPublish = async (
  input: unknown,
  options: RunPublishOptions,
): Promise<PublishResult> => {
  const request = publishRequestSchema.parse(input);
  const videoPath = path.resolve(request.video_path);
  assertVideoFile(videoPath);
  const videoSha256 = hashFile(videoPath);

  if (!(await options.isEnabled(FLAGS.VIDEO_PUBLISH))) {
    const result = blocked(
      request,
      videoSha256,
      'Video publish is disabled. Set FLAG_video_publish=\'{"enabled":true}\' after explicit approval.',
    );
    writePublishAudit(result, options.auditPath);
    return result;
  }
  if (!(await options.isEnabled(platformFlag(request.platform)))) {
    const result = blocked(
      request,
      videoSha256,
      `Publish for ${request.platform} is disabled by its feature flag.`,
    );
    writePublishAudit(result, options.auditPath);
    return result;
  }

  if (request.platform === "weixin-channels" || request.platform === "xiaohongshu") {
    const packDir =
      options.packDir ?? path.join(path.dirname(videoPath), "publish-pack");
    const packPath = writePublishPack(
      { ...request, video_path: videoPath },
      packDir,
    );
    const result: PublishResult = {
      status: "packed",
      platform: request.platform,
      video_path: videoPath,
      video_sha256: videoSha256,
      account_alias: request.account_alias,
      title: request.title,
      schedule_at: request.schedule_at ?? null,
      platform_post_id: null,
      pack_path: packPath,
      error_code: null,
      message:
        "Assisted publish pack written. Upload and post manually in the official creator console. RPA is not used.",
    };
    writePublishAudit(result, options.auditPath);
    return result;
  }

  const scheduleAt = request.schedule_at ? Date.parse(request.schedule_at) : NaN;
  const now = options.now ?? new Date();
  if (request.schedule_at && Number.isNaN(scheduleAt)) {
    throw new Error("schedule_at must be a valid ISO-8601 timestamp.");
  }
  if (request.schedule_at && scheduleAt > now.getTime()) {
    const id = `douyin-${videoSha256.slice(0, 12)}-${scheduleAt}`;
    enqueueScheduledPublish(options.scheduleDir, request, id, now);
    const result: PublishResult = {
      status: "scheduled",
      platform: "douyin",
      video_path: videoPath,
      video_sha256: videoSha256,
      account_alias: request.account_alias,
      title: request.title,
      schedule_at: request.schedule_at,
      platform_post_id: null,
      pack_path: null,
      error_code: null,
      message:
        "Queued locally. Douyin create_video has no native schedule field; run video:publish --due at/after schedule_at.",
    };
    writePublishAudit(result, options.auditPath);
    return result;
  }

  try {
    const credentials = loadDouyinCredentials(options.env);
    const client = options.douyin ?? createHttpDouyinClient();
    const uploaded = await client.uploadVideo({
      credentials,
      filePath: videoPath,
    });
    const created = await client.createVideo({
      credentials,
      text: composeDouyinText(request.title, request.topics),
      videoId: uploaded.video_id,
    });
    const result: PublishResult = {
      status: "submitted",
      platform: "douyin",
      video_path: videoPath,
      video_sha256: videoSha256,
      account_alias: request.account_alias,
      title: request.title,
      schedule_at: request.schedule_at ?? null,
      platform_post_id: created.item_id ?? uploaded.video_id,
      pack_path: null,
      error_code: null,
      message: request.schedule_at
        ? "Submitted to Douyin after local schedule elapsed (platform may still review)."
        : "Submitted to Douyin (platform may still review).",
    };
    writePublishAudit(result, options.auditPath);
    return result;
  } catch (error) {
    const result: PublishResult = {
      status: "failed",
      platform: "douyin",
      video_path: videoPath,
      video_sha256: videoSha256,
      account_alias: request.account_alias,
      title: request.title,
      schedule_at: request.schedule_at ?? null,
      platform_post_id: null,
      pack_path: null,
      error_code: "douyin_api",
      message: error instanceof Error ? error.message : String(error),
    };
    writePublishAudit(result, options.auditPath);
    return result;
  }
};

export const runDueScheduledPublish = async (
  options: RunPublishOptions,
): Promise<PublishResult[]> => {
  const due = listDueScheduledPublish(options.scheduleDir, options.now);
  const results: PublishResult[] = [];
  for (const job of due) {
    const result = await runPublish(
      { ...job.request, schedule_at: null },
      options,
    );
    if (result.status === "submitted") {
      markScheduledPublishDone(options.scheduleDir, job.id);
    }
    results.push(result);
  }
  return results;
};
