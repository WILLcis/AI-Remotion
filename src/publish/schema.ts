import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const publishPlatformSchema = z.enum([
  "douyin",
  "weixin-channels",
  "xiaohongshu",
]);

export type PublishPlatform = z.infer<typeof publishPlatformSchema>;

export const resolvePublishPlatforms = (
  platformRaw: string,
  options: { skipDouyin?: boolean } = {},
): PublishPlatform[] => {
  const platforms =
    platformRaw === "all"
      ? [...publishPlatformSchema.options]
      : [publishPlatformSchema.parse(platformRaw)];
  if (platformRaw === "all" && options.skipDouyin) {
    return platforms.filter((platform) => platform !== "douyin");
  }
  return platforms;
};

export const publishRequestSchema = z
  .object({
    platform: publishPlatformSchema,
    video_path: nonEmptyString,
    title: nonEmptyString,
    caption: z.string().optional(),
    cover_path: nonEmptyString.optional(),
    topics: z.array(nonEmptyString).default([]),
    visibility: z.enum(["public", "private"]).default("public"),
    account_alias: nonEmptyString.default("default"),
    schedule_at: z.union([z.string().min(1), z.null()]).optional(),
    approve_publish: z.literal(true),
  })
  .strict();

export type PublishRequest = z.infer<typeof publishRequestSchema>;

export const publishResultSchema = z
  .object({
    status: z.enum(["submitted", "scheduled", "packed", "blocked", "failed"]),
    platform: publishPlatformSchema,
    video_path: nonEmptyString,
    video_sha256: nonEmptyString,
    account_alias: nonEmptyString,
    title: nonEmptyString,
    schedule_at: z.string().nullable(),
    platform_post_id: z.string().nullable(),
    pack_path: z.string().nullable(),
    error_code: z.string().nullable(),
    message: nonEmptyString,
  })
  .strict();

export type PublishResult = z.infer<typeof publishResultSchema>;
