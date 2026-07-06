import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const nonNegativeInt = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();
const positiveNumber = z.number().positive();

export const aspectRatioSchema = z.enum(["9:16", "16:9"]);
export const languageSchema = z.enum(["zh", "en"]);

export const sceneTypeSchema = z.enum([
  "title",
  "key_point",
  "image_card",
  "list",
  "timeline",
  "comparison",
  "quote",
  "cta",
]);

export const briefSchema = z
  .object({
    topic: nonEmptyString,
    audience: nonEmptyString,
    platform: nonEmptyString,
    duration_seconds: positiveNumber,
    aspect_ratio: aspectRatioSchema,
    tone: nonEmptyString,
    voice: nonEmptyString,
    visual_style: nonEmptyString,
    source_notes: z.array(nonEmptyString).default([]),
    must_include: z.array(nonEmptyString).default([]),
    must_avoid: z.array(nonEmptyString).default([]),
  })
  .strict();

export const storyboardSceneSchema = z
  .object({
    id: nonEmptyString,
    duration_seconds: positiveNumber,
    narration: nonEmptyString,
    caption: nonEmptyString,
    visual_type: sceneTypeSchema,
    visual_direction: nonEmptyString,
    assets: z.array(nonEmptyString).default([]),
    animation: nonEmptyString,
  })
  .strict();

export const storyboardSchema = z
  .object({
    episode_id: nonEmptyString,
    scenes: z.array(storyboardSceneSchema).min(1),
    duration_notes: z.string().optional(),
  })
  .strict();

export const themeTokensSchema = z
  .object({
    id: nonEmptyString,
    background: nonEmptyString,
    surface: nonEmptyString,
    surfaceMuted: nonEmptyString,
    text: nonEmptyString,
    textMuted: nonEmptyString,
    accent: nonEmptyString,
    accentStrong: nonEmptyString,
    border: nonEmptyString,
  })
  .strict();

export const safeAreaSchema = z
  .object({
    top: nonNegativeInt,
    right: nonNegativeInt,
    bottom: nonNegativeInt,
    left: nonNegativeInt,
  })
  .strict();

export const captionItemSchema = z
  .object({
    start_frame: nonNegativeInt,
    end_frame: positiveInt,
    text: nonEmptyString,
  })
  .strict()
  .refine((caption) => caption.end_frame > caption.start_frame, {
    message: "end_frame must be greater than start_frame",
    path: ["end_frame"],
  });

export const sceneVisualSchema = z
  .object({
    eyebrow: nonEmptyString.optional(),
    primary: nonEmptyString.optional(),
    secondary: nonEmptyString.optional(),
    bullets: z.array(nonEmptyString).optional(),
    quote: nonEmptyString.optional(),
    attribution: nonEmptyString.optional(),
    left_label: nonEmptyString.optional(),
    left_points: z.array(nonEmptyString).optional(),
    right_label: nonEmptyString.optional(),
    right_points: z.array(nonEmptyString).optional(),
    timeline_items: z
      .array(
        z
          .object({
            label: nonEmptyString,
            text: nonEmptyString,
          })
          .strict(),
      )
      .optional(),
    assets: z.array(nonEmptyString).optional(),
  })
  .strict();

export const renderSceneSchema = z
  .object({
    id: nonEmptyString,
    type: sceneTypeSchema,
    title: nonEmptyString,
    narration: nonEmptyString,
    caption: nonEmptyString,
    duration_seconds: positiveNumber,
    start_frame: nonNegativeInt,
    duration_frames: positiveInt,
    visual: sceneVisualSchema,
  })
  .strict();

export const renderPlanSchema = z
  .object({
    episode_id: nonEmptyString,
    metadata: z
      .object({
        title: nonEmptyString,
        subtitle: nonEmptyString.optional(),
        platform: nonEmptyString,
        language: languageSchema,
        duration_seconds: positiveNumber,
        aspect_ratio: aspectRatioSchema,
      })
      .strict(),
    theme: themeTokensSchema,
    video: z
      .object({
        fps: positiveInt,
        width: positiveInt,
        height: positiveInt,
        duration_frames: positiveInt,
        safe_area: safeAreaSchema,
      })
      .strict(),
    audio: z
      .object({
        duration_seconds: positiveNumber.nullable(),
        voiceover_path: z.string().min(1).nullable(),
      })
      .strict(),
    captions: z
      .object({
        enabled: z.boolean(),
        items: z.array(captionItemSchema),
      })
      .strict(),
    scenes: z.array(renderSceneSchema).min(1),
  })
  .strict()
  .superRefine((plan, ctx) => {
    const isVertical = plan.metadata.aspect_ratio === "9:16";
    const hasExpectedOrientation = isVertical
      ? plan.video.height > plan.video.width
      : plan.video.width > plan.video.height;

    if (!hasExpectedOrientation) {
      ctx.addIssue({
        code: "custom",
        message: "video width/height does not match metadata.aspect_ratio",
        path: ["video"],
      });
    }

    let expectedStartFrame = 0;
    for (const [index, scene] of plan.scenes.entries()) {
      if (scene.start_frame !== expectedStartFrame) {
        ctx.addIssue({
          code: "custom",
          message: `scene must start at frame ${expectedStartFrame}`,
          path: ["scenes", index, "start_frame"],
        });
      }

      expectedStartFrame += scene.duration_frames;
    }

    if (expectedStartFrame !== plan.video.duration_frames) {
      ctx.addIssue({
        code: "custom",
        message: `scene frames sum to ${expectedStartFrame}, expected video.duration_frames ${plan.video.duration_frames}`,
        path: ["scenes"],
      });
    }

    const expectedDurationSeconds = plan.video.duration_frames / plan.video.fps;
    const driftSeconds = Math.abs(
      expectedDurationSeconds - plan.metadata.duration_seconds,
    );
    if (driftSeconds > 0.25) {
      ctx.addIssue({
        code: "custom",
        message: `metadata.duration_seconds differs from frame duration by ${driftSeconds.toFixed(3)}s`,
        path: ["metadata", "duration_seconds"],
      });
    }

    for (const [index, caption] of plan.captions.items.entries()) {
      if (caption.end_frame > plan.video.duration_frames) {
        ctx.addIssue({
          code: "custom",
          message: "caption end_frame exceeds video duration",
          path: ["captions", "items", index, "end_frame"],
        });
      }
    }
  });

export type Brief = z.infer<typeof briefSchema>;
export type Storyboard = z.infer<typeof storyboardSchema>;
export type StoryboardScene = z.infer<typeof storyboardSceneSchema>;
export type RenderPlan = z.infer<typeof renderPlanSchema>;
export type RenderScene = z.infer<typeof renderSceneSchema>;
export type SceneType = z.infer<typeof sceneTypeSchema>;
export type AspectRatio = z.infer<typeof aspectRatioSchema>;
