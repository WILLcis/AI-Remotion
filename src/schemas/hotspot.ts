import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const hotspotFormatSchema = z.enum(["human-vo", "digital-human"]);
export type HotspotFormat = z.infer<typeof hotspotFormatSchema>;

export const hotspotItemSchema = z
  .object({
    title: nonEmptyString,
    summary: nonEmptyString,
    url: z.string().trim().min(1).optional(),
    source: z.string().trim().min(1).optional(),
    published_at: z.string().trim().min(1).optional(),
  })
  .strict();

export type HotspotItem = z.infer<typeof hotspotItemSchema>;

export const hotspotRepeatSchema = z.enum(["none", "daily"]);

export const hotspotRequestSchema = z
  .object({
    format: hotspotFormatSchema,
    topic: nonEmptyString,
    items: z.array(hotspotItemSchema).default([]),
    count: z.number().int().min(1).max(10).default(3),
    date: z.string().trim().min(1).optional(),
    presenter_prompt: z.string().trim().min(1).optional(),
    photo_path: z.string().trim().min(1).optional(),
    audio_path: z.string().trim().min(1).optional(),
    audio_transcript: z.string().trim().min(1).optional(),
    schedule_at: z.union([z.string().min(1), z.null()]).optional(),
    repeat: hotspotRepeatSchema.default("none"),
    daily_time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional(),
    pack_only: z.boolean().default(false),
    execute_generation: z.boolean().optional(),
  })
  .strict()
  .superRefine((request, context) => {
    if (request.repeat === "daily" && !request.daily_time) {
      context.addIssue({
        code: "custom",
        message: "daily repeat requires daily_time as HH:mm",
        path: ["daily_time"],
      });
    }
    const hasPhoto = Boolean(request.photo_path);
    const hasAudio = Boolean(request.audio_path);
    if (hasPhoto !== hasAudio) {
      context.addIssue({
        code: "custom",
        message: "photo_path and audio_path must be provided together",
        path: hasPhoto ? ["audio_path"] : ["photo_path"],
      });
    }
    if ((hasPhoto || hasAudio) && request.format !== "digital-human") {
      context.addIssue({
        code: "custom",
        message: "photo_path and audio_path are only valid for digital-human",
        path: ["photo_path"],
      });
    }
  });

export type HotspotRequest = z.infer<typeof hotspotRequestSchema>;

export const hotspotClipSchema = z
  .object({
    index: z.number().int().min(1),
    headline: nonEmptyString,
    hook_title: nonEmptyString,
    cover_keyword: nonEmptyString,
    cover: nonEmptyString,
    tags: nonEmptyString,
    spoken: nonEmptyString,
    dreamina_prompt: z.string().trim().min(1).optional(),
    sources: z.array(hotspotItemSchema),
  })
  .strict();

export type HotspotClip = z.infer<typeof hotspotClipSchema>;

export const hotspotPackSchema = z
  .object({
    format: hotspotFormatSchema,
    topic: nonEmptyString,
    date_label: nonEmptyString,
    clips: z.array(hotspotClipSchema).min(1),
  })
  .strict();

export type HotspotPack = z.infer<typeof hotspotPackSchema>;

export const hotspotResultSchema = z
  .object({
    status: z.enum([
      "done",
      "needs_clarification",
      "needs_search",
      "scheduled",
      "blocked",
      "failed",
    ]),
    format: hotspotFormatSchema.optional(),
    pack_path: z.string().nullable(),
    markdown: z.string().nullable(),
    missing_fields: z.array(z.string()),
    questions: z.array(z.string()),
    generated_videos: z.array(z.string()),
    publish_results: z.array(z.unknown()),
    next_action: z.string(),
  })
  .strict();

export type HotspotResult = z.infer<typeof hotspotResultSchema>;

/** Default digital-human look. Lip-sync and captions are required on every Dreamina call. */
export const DEFAULT_DREAMINA_PRESENTER_PROMPT =
  "28到32岁职业男性，面相年轻且明显美颜，皮肤光滑透亮，干练黑色短发向后梳起，戴无边框眼镜，坐在办公椅上微微侧身，一手转钢笔，表情不屑中带嘲讽，背后是书架和装饰画，左暖右冷分层布光，半身镜头，面部清晰，禁止沧桑显老，人体结构正常，动作流畅，画面稳定，正在对镜头用中文说话，口型匹配，嘴唇明显开合，口型跟随对白，下颌活动，不要闭嘴静止，必须叠加中英双语字幕，无畸变，4K高清，电影感。";
