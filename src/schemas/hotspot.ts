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
  });

export type HotspotRequest = z.infer<typeof hotspotRequestSchema>;

export const hotspotClipSchema = z
  .object({
    index: z.number().int().min(1),
    headline: nonEmptyString,
    hook_title: nonEmptyString,
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

/** Default digital-human look from docs/example.md. */
export const DEFAULT_DREAMINA_PRESENTER_PROMPT =
  "35岁左右职业男性，干练黑色短发向后梳起，戴无边框眼镜，坐在办公椅上微微侧身，一手转钢笔，表情不屑中带嘲讽，背后是书架和装饰画，左暖右冷分层布光，半身镜头，面部清晰，人体结构正常，动作流畅，画面稳定，无畸变，4K高清，电影感，不要字幕，不要修改内容。";
