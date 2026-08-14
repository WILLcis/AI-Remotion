import {
  type VideoJob,
  type VideoRoute,
  videoJobSchema,
  videoRouteSchema,
} from "../schemas/videoJob";
import {
  getVideoGenerationServiceInfo,
  skipsHumanApprovalGates,
  type VideoGenerationService,
} from "../schemas/videoGenerationServices";

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
  "shorts-repackage": {
    agent: "shorts-repackage-producer",
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
} as const satisfies Record<
  string,
  { agent: string; renderer: "remotion" | "hyperframes" }
>;

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
  const renderer = resolveExclusiveCompositionEngine(job, config.renderer);

  // Local engine lock only applies when the user did not pick an exclusive cloud/local service.
  if (
    !job.generation?.service &&
    job.render.engine !== "auto" &&
    job.render.engine !== config.renderer
  ) {
    throw new Error(
      `${workflow} requires renderer ${config.renderer}; received ${job.render.engine}`,
    );
  }

  if (
    job.generation?.service &&
    (job.generation.service === "remotion" ||
      job.generation.service === "hyperframes") &&
    job.render.engine !== "auto" &&
    job.render.engine !== job.generation.service
  ) {
    throw new Error(
      `generation.service=${job.generation.service} conflicts with render.engine=${job.render.engine}`,
    );
  }

  const delegatedCapabilities =
    workflow === "product-promo" && job.presenter.mode === "digital-human"
      ? (["digital-human-presenter"] as const)
      : [];
  const providerRequirements = [
    ...(workflow === "video-translation" ||
    job.presenter.mode === "digital-human"
      ? [job.presenter.provider!]
      : []),
    ...(renderer === "heygen" || renderer === "dreamina" ? [renderer] : []),
  ];
  const requiresApproval: Array<"script" | "storyboard" | "final_render" | "publish"> =
    skipsHumanApprovalGates(job.generation?.service)
      ? []
      : (["script", "storyboard", "final_render"] as const).filter(
          (gate) => job.review_gates[gate] === "pending",
        );
  if (
    !skipsHumanApprovalGates(job.generation?.service) &&
    job.review_gates.publish === "pending"
  ) {
    requiresApproval.push("publish");
  }

  const ttsPolicy =
    renderer === "heygen" || renderer === "dreamina"
      ? getVideoGenerationServiceInfo(renderer).tts
      : getVideoGenerationServiceInfo(
          renderer === "hyperframes" ? "hyperframes" : "remotion",
        ).tts;

  return videoRouteSchema.parse({
    job_id: job.job_id,
    workflow,
    primary_agent: config.agent,
    renderer,
    provider_requirements: [...new Set(providerRequirements)],
    delegated_capabilities: delegatedCapabilities,
    requires_approval: requiresApproval,
    reason: getRouteReason(job, workflow, renderer),
    tts_policy: ttsPolicy,
  });
};

/**
 * User-selected generation.service owns the final composition exclusively.
 * Without it, fall back to the workflow's historical local renderer.
 */
const resolveExclusiveCompositionEngine = (
  job: VideoJob,
  workflowRenderer: "remotion" | "hyperframes",
): VideoGenerationService => {
  if (job.generation?.service) {
    return job.generation.service;
  }
  return workflowRenderer;
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
  renderer: VideoGenerationService,
): string => {
  const exclusive = job.generation?.service
    ? ` Exclusive composition engine: ${renderer} (user-selected generation.service; do not mix other final renderers). TTS: ${getVideoGenerationServiceInfo(renderer).tts}.`
    : ` Composition engine from workflow default: ${renderer}. TTS: ${getVideoGenerationServiceInfo(renderer).tts}.`;

  if (job.workflow !== "auto") {
    return `Explicit workflow selected: ${workflow}.${exclusive}`;
  }

  const reasons: Record<Exclude<VideoJob["workflow"], "auto">, string> = {
    "product-promo": `Source type ${job.source.type} is product-led`,
    "digital-human":
      "Digital-human presenter requested for a non-product-led source",
    "faceless-explainer": `Source type ${job.source.type} uses the faceless explainer pipeline`,
    "existing-video-recut":
      "Source type existing-video uses the existing footage recut pipeline",
    "shorts-repackage":
      "Explicit workflow shorts-repackage uses the approved short-form repackage pipeline",
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

  return `${reasons[workflow]}.${exclusive}`;
};
