import { z } from "zod";
import { aspectRatioSchema, languageSchema } from "./artifacts";
import { videoGenerationServiceSchema } from "./videoGenerationServices";

const nonEmptyString = z.string().trim().min(1);
const workflowIdSchema = z.enum([
  "product-promo",
  "digital-human",
  "faceless-explainer",
  "existing-video-recut",
  "shorts-repackage",
  "embedded-captions",
  "pr-video",
  "music-video",
  "video-translation",
  "motion-graphics",
  "slideshow",
  "remotion-port",
]);

export const videoWorkflowSchema = z.enum([
  "auto",
  ...workflowIdSchema.options,
]);

export const videoSourceTypeSchema = z.enum([
  "topic",
  "script",
  "product-brief",
  "website",
  "existing-video",
  "github-pr",
  "music",
  "deck",
  "motion-brief",
  "remotion-project",
]);

export const presenterModeSchema = z.enum(["none", "digital-human"]);
export const videoRenderEngineSchema = z.enum([
  "auto",
  "remotion",
  "hyperframes",
]);
export const reviewGateStatusSchema = z.enum(["pending", "approved"]);

const existingVideoWorkflows = new Set([
  "auto",
  "existing-video-recut",
  "shorts-repackage",
  "embedded-captions",
  "video-translation",
]);

const requireSourceType = (
  job: {
    workflow: z.infer<typeof videoWorkflowSchema>;
    source: { type: z.infer<typeof videoSourceTypeSchema> };
  },
  workflow: z.infer<typeof workflowIdSchema>,
  sourceType: z.infer<typeof videoSourceTypeSchema>,
  context: z.RefinementCtx,
) => {
  if (job.workflow === workflow && job.source.type !== sourceType) {
    context.addIssue({
      code: "custom",
      message: `${workflow} workflow requires source.type=${sourceType}`,
      path: ["source", "type"],
    });
  }
};

const requirePresenterNone = (
  job: {
    workflow: z.infer<typeof videoWorkflowSchema>;
    presenter: { mode: z.infer<typeof presenterModeSchema> };
  },
  workflow: z.infer<typeof workflowIdSchema>,
  context: z.RefinementCtx,
) => {
  if (job.workflow === workflow && job.presenter.mode !== "none") {
    context.addIssue({
      code: "custom",
      message: `${workflow} workflow requires presenter.mode=none`,
      path: ["presenter", "mode"],
    });
  }
};

export const videoJobSchema = z
  .object({
    job_id: nonEmptyString.regex(/^[a-z0-9][a-z0-9-]*$/),
    workflow: videoWorkflowSchema.default("auto"),
    source: z
      .object({
        type: videoSourceTypeSchema,
        subject: nonEmptyString,
        refs: z.array(nonEmptyString).default([]),
      })
      .strict(),
    output: z
      .object({
        duration_seconds: z.number().positive(),
        aspect_ratio: aspectRatioSchema,
        language: languageSchema,
      })
      .strict(),
    presenter: z
      .object({
        mode: presenterModeSchema.default("none"),
        provider: nonEmptyString.optional(),
      })
      .strict()
      .default({ mode: "none" }),
    render: z
      .object({
        engine: videoRenderEngineSchema.default("auto"),
      })
      .strict()
      .default({ engine: "auto" }),
    generation: z
      .object({
        service: videoGenerationServiceSchema,
      })
      .strict()
      .optional(),
    review_gates: z
      .object({
        script: reviewGateStatusSchema.default("pending"),
        storyboard: reviewGateStatusSchema.default("pending"),
        final_render: reviewGateStatusSchema.default("pending"),
        publish: reviewGateStatusSchema.optional(),
      })
      .strict()
      .default({
        script: "pending",
        storyboard: "pending",
        final_render: "pending",
      }),
  })
  .strict()
  .superRefine((job, context) => {
    const providerAllowedWithNone = job.workflow === "video-translation";

    if (
      job.presenter.mode === "none" &&
      job.presenter.provider &&
      !providerAllowedWithNone
    ) {
      context.addIssue({
        code: "custom",
        message: "presenter.provider requires presenter.mode=digital-human",
        path: ["presenter", "provider"],
      });
    }

    if (
      job.presenter.mode === "digital-human" &&
      !job.presenter.provider
    ) {
      context.addIssue({
        code: "custom",
        message: "presenter.provider is required for digital-human mode",
        path: ["presenter", "provider"],
      });
    }

    if (
      job.workflow === "digital-human" &&
      job.presenter.mode !== "digital-human"
    ) {
      context.addIssue({
        code: "custom",
        message: "digital-human workflow requires presenter.mode=digital-human",
        path: ["presenter", "mode"],
      });
    }

    if (
      job.workflow === "faceless-explainer" &&
      job.presenter.mode !== "none"
    ) {
      context.addIssue({
        code: "custom",
        message: "faceless-explainer workflow requires presenter.mode=none",
        path: ["presenter", "mode"],
      });
    }

    requireSourceType(job, "existing-video-recut", "existing-video", context);
    requirePresenterNone(job, "existing-video-recut", context);
    requireSourceType(job, "shorts-repackage", "existing-video", context);
    requirePresenterNone(job, "shorts-repackage", context);
    requireSourceType(job, "embedded-captions", "existing-video", context);
    requirePresenterNone(job, "embedded-captions", context);
    requireSourceType(job, "video-translation", "existing-video", context);
    requirePresenterNone(job, "video-translation", context);
    requireSourceType(job, "pr-video", "github-pr", context);
    requirePresenterNone(job, "pr-video", context);
    requireSourceType(job, "music-video", "music", context);
    requirePresenterNone(job, "music-video", context);
    requireSourceType(job, "slideshow", "deck", context);
    requirePresenterNone(job, "slideshow", context);
    requireSourceType(job, "motion-graphics", "motion-brief", context);
    requirePresenterNone(job, "motion-graphics", context);
    requireSourceType(job, "remotion-port", "remotion-project", context);
    requirePresenterNone(job, "remotion-port", context);

    if (
      job.workflow === "video-translation" &&
      !job.presenter.provider
    ) {
      context.addIssue({
        code: "custom",
        message:
          "video-translation workflow requires presenter.provider (e.g. heygen)",
        path: ["presenter", "provider"],
      });
    }

    if (job.source.type === "existing-video" && job.source.refs.length === 0) {
      context.addIssue({
        code: "custom",
        message: "existing-video source requires at least one local file ref",
        path: ["source", "refs"],
      });
    }

    if (
      job.source.type === "existing-video" &&
      !existingVideoWorkflows.has(job.workflow)
    ) {
      context.addIssue({
        code: "custom",
        message:
          "existing-video source supports only auto, existing-video-recut, shorts-repackage, embedded-captions, or video-translation",
        path: ["workflow"],
      });
    }

    if (
      job.workflow === "shorts-repackage" &&
      job.output.duration_seconds > 60
    ) {
      context.addIssue({
        code: "custom",
        message: "shorts-repackage workflow requires output.duration_seconds <= 60",
        path: ["output", "duration_seconds"],
      });
    }

    if (
      job.generation?.service === "remotion" &&
      job.render.engine === "hyperframes"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "generation.service=remotion conflicts with render.engine=hyperframes",
        path: ["generation", "service"],
      });
    }

    if (
      job.generation?.service === "hyperframes" &&
      job.render.engine === "remotion"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "generation.service=hyperframes conflicts with render.engine=remotion",
        path: ["generation", "service"],
      });
    }

    if (
      job.source.type === "existing-video" &&
      job.presenter.mode === "digital-human"
    ) {
      context.addIssue({
        code: "custom",
        message:
          "existing-video source cannot request a digital-human presenter",
        path: ["presenter", "mode"],
      });
    }

    const typedSources: Array<{
      type: z.infer<typeof videoSourceTypeSchema>;
      workflows: Set<string>;
    }> = [
      {
        type: "github-pr",
        workflows: new Set(["auto", "pr-video"]),
      },
      {
        type: "music",
        workflows: new Set(["auto", "music-video"]),
      },
      {
        type: "deck",
        workflows: new Set(["auto", "slideshow"]),
      },
      {
        type: "motion-brief",
        workflows: new Set(["auto", "motion-graphics"]),
      },
      {
        type: "remotion-project",
        workflows: new Set(["auto", "remotion-port"]),
      },
    ];

    for (const entry of typedSources) {
      if (
        job.source.type === entry.type &&
        !entry.workflows.has(job.workflow)
      ) {
        context.addIssue({
          code: "custom",
          message: `${entry.type} source supports only ${[...entry.workflows].join(" or ")}`,
          path: ["workflow"],
        });
      }

      if (
        job.source.type === entry.type &&
        job.source.refs.length === 0 &&
        entry.type !== "motion-brief"
      ) {
        context.addIssue({
          code: "custom",
          message: `${entry.type} source requires at least one ref`,
          path: ["source", "refs"],
        });
      }
    }
  });

export const videoAgentSchema = z.enum([
  "product-promo-producer",
  "digital-human-producer",
  "faceless-explainer-producer",
  "existing-video-recut-producer",
  "shorts-repackage-producer",
  "embedded-captions-producer",
  "pr-video-producer",
  "music-video-producer",
  "video-translation-producer",
  "motion-graphics-producer",
  "slideshow-producer",
  "remotion-port-producer",
]);
export const videoApprovalGateSchema = z.enum([
  "script",
  "storyboard",
  "final_render",
  "publish",
]);
export const delegatedVideoCapabilitySchema = z.enum([
  "digital-human-presenter",
]);

export const videoRouteSchema = z
  .object({
    job_id: nonEmptyString,
    workflow: workflowIdSchema,
    primary_agent: videoAgentSchema,
    /** Exclusive final composition engine. When Job.generation.service is set, equals that service. */
    renderer: videoGenerationServiceSchema,
    provider_requirements: z.array(nonEmptyString),
    delegated_capabilities: z.array(delegatedVideoCapabilitySchema),
    requires_approval: z.array(videoApprovalGateSchema),
    reason: nonEmptyString,
    tts_policy: z.enum([
      "project-tts",
      "heygen-native",
      "dreamina-native",
    ]),
  })
  .strict();

export type VideoWorkflow = z.infer<typeof videoWorkflowSchema>;
export type VideoJob = z.infer<typeof videoJobSchema>;
export type VideoRoute = z.infer<typeof videoRouteSchema>;
