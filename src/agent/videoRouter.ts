import {
  type VideoJob,
  type VideoRoute,
  videoJobSchema,
  videoRouteSchema,
} from "../schemas/videoJob";

export type RouteVideoJobOptions = {
  enabled: boolean;
};

const routeConfig = {
  "product-promo": {
    agent: "product-promo-producer",
    renderer: "hyperframes",
  },
  "digital-human": {
    agent: "digital-human-producer",
    renderer: "remotion",
  },
  "faceless-explainer": {
    agent: "faceless-explainer-producer",
    renderer: "remotion",
  },
} as const;

export const routeVideoJob = (
  input: unknown,
  { enabled }: RouteVideoJobOptions,
): VideoRoute => {
  if (!enabled) {
    throw new Error(
      "Video Agent Platform is disabled by FLAGS.VIDEO_AGENT_PLATFORM",
    );
  }

  const job = videoJobSchema.parse(input);
  const workflow = resolveWorkflow(job);
  const config = routeConfig[workflow];

  if (job.render.engine !== "auto" && job.render.engine !== config.renderer) {
    throw new Error(
      `${workflow} requires renderer ${config.renderer}; received ${job.render.engine}`,
    );
  }

  const delegatedCapabilities =
    workflow === "product-promo" && job.presenter.mode === "digital-human"
      ? (["digital-human-presenter"] as const)
      : [];
  const providerRequirements =
    job.presenter.mode === "digital-human" ? [job.presenter.provider] : [];
  const requiresApproval = (
    ["script", "storyboard", "final_render"] as const
  ).filter((gate) => job.review_gates[gate] === "pending");

  return videoRouteSchema.parse({
    job_id: job.job_id,
    workflow,
    primary_agent: config.agent,
    renderer: config.renderer,
    provider_requirements: providerRequirements,
    delegated_capabilities: delegatedCapabilities,
    requires_approval: requiresApproval,
    reason: getRouteReason(job, workflow),
  });
};

const resolveWorkflow = (
  job: VideoJob,
): Exclude<VideoJob["workflow"], "auto"> => {
  if (job.workflow !== "auto") {
    return job.workflow;
  }

  if (job.source.type === "product-brief" || job.source.type === "website") {
    return "product-promo";
  }

  if (job.presenter.mode === "digital-human") {
    return "digital-human";
  }

  return "faceless-explainer";
};

const getRouteReason = (
  job: VideoJob,
  workflow: Exclude<VideoJob["workflow"], "auto">,
): string => {
  if (job.workflow !== "auto") {
    return `Explicit workflow selected: ${workflow}`;
  }

  if (workflow === "product-promo") {
    return `Source type ${job.source.type} is product-led`;
  }

  if (workflow === "digital-human") {
    return "Digital-human presenter requested for a non-product-led source";
  }

  return `Source type ${job.source.type} uses the faceless explainer pipeline`;
};
