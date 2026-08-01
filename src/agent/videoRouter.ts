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
  "existing-video-recut": {
    agent: "existing-video-recut-producer",
    renderer: "hyperframes",
  },
  "embedded-captions": {
    agent: "embedded-captions-producer",
    renderer: "hyperframes",
  },
  "pr-video": {
    agent: "pr-video-producer",
    renderer: "hyperframes",
  },
  "music-video": {
    agent: "music-video-producer",
    renderer: "hyperframes",
  },
  "video-translation": {
    agent: "video-translation-producer",
    renderer: "remotion",
  },
  "motion-graphics": {
    agent: "motion-graphics-producer",
    renderer: "hyperframes",
  },
  slideshow: {
    agent: "slideshow-producer",
    renderer: "hyperframes",
  },
  "remotion-port": {
    agent: "remotion-port-producer",
    renderer: "hyperframes",
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
    workflow === "video-translation"
      ? [job.presenter.provider!]
      : job.presenter.mode === "digital-human"
        ? [job.presenter.provider!]
        : [];
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

  if (job.source.type === "github-pr") {
    return "pr-video";
  }

  if (job.source.type === "music") {
    return "music-video";
  }

  if (job.source.type === "deck") {
    return "slideshow";
  }

  if (job.source.type === "remotion-project") {
    return "remotion-port";
  }

  if (job.source.type === "motion-brief") {
    return "motion-graphics";
  }

  if (job.source.type === "existing-video") {
    return "existing-video-recut";
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

  const reasons: Record<Exclude<VideoJob["workflow"], "auto">, string> = {
    "product-promo": `Source type ${job.source.type} is product-led`,
    "digital-human":
      "Digital-human presenter requested for a non-product-led source",
    "faceless-explainer": `Source type ${job.source.type} uses the faceless explainer pipeline`,
    "existing-video-recut":
      "Source type existing-video uses the existing footage recut pipeline",
    "embedded-captions":
      "Source type existing-video uses the embedded captions pipeline",
    "pr-video": "Source type github-pr uses the pull-request video pipeline",
    "music-video": "Source type music uses the beat-synced music video pipeline",
    "video-translation":
      "Source type existing-video uses the video translation pipeline",
    "motion-graphics":
      "Source type motion-brief uses the short motion-graphics pipeline",
    slideshow: "Source type deck uses the slideshow / pitch-deck pipeline",
    "remotion-port":
      "Source type remotion-project uses the Remotion-to-HyperFrames port pipeline",
  };

  return reasons[workflow];
};
