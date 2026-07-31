import { z } from "zod";
import { aspectRatioSchema, languageSchema } from "./artifacts";

const nonEmptyString = z.string().trim().min(1);
const workflowIdSchema = z.enum([
  "product-promo",
  "digital-human",
  "faceless-explainer",
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
]);

export const presenterModeSchema = z.enum(["none", "digital-human"]);
export const videoRenderEngineSchema = z.enum([
  "auto",
  "remotion",
  "hyperframes",
]);
export const reviewGateStatusSchema = z.enum(["pending", "approved"]);

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
    review_gates: z
      .object({
        script: reviewGateStatusSchema.default("pending"),
        storyboard: reviewGateStatusSchema.default("pending"),
        final_render: reviewGateStatusSchema.default("pending"),
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
    if (job.presenter.mode === "none" && job.presenter.provider) {
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
  });

export const videoAgentSchema = z.enum([
  "product-promo-producer",
  "digital-human-producer",
  "faceless-explainer-producer",
]);
export const videoApprovalGateSchema = z.enum([
  "script",
  "storyboard",
  "final_render",
]);
export const delegatedVideoCapabilitySchema = z.enum([
  "digital-human-presenter",
]);

export const videoRouteSchema = z
  .object({
    job_id: nonEmptyString,
    workflow: workflowIdSchema,
    primary_agent: videoAgentSchema,
    renderer: z.enum(["remotion", "hyperframes"]),
    provider_requirements: z.array(nonEmptyString),
    delegated_capabilities: z.array(delegatedVideoCapabilitySchema),
    requires_approval: z.array(videoApprovalGateSchema),
    reason: nonEmptyString,
  })
  .strict();

export type VideoWorkflow = z.infer<typeof videoWorkflowSchema>;
export type VideoJob = z.infer<typeof videoJobSchema>;
export type VideoRoute = z.infer<typeof videoRouteSchema>;
