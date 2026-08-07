import { z } from "zod";
import { aspectRatioSchema, languageSchema } from "./artifacts";
import { type VideoJob, videoJobSchema } from "./videoJob";

const nonEmptyString = z.string().trim().min(1);

const videoIntakeDefaultsSchema = z
  .object({
    aspect_ratio: aspectRatioSchema,
    duration_seconds: z.number().positive(),
    language: languageSchema,
  })
  .strict();

export const videoIntakeRequestSchema = z
  .object({
    request_id: nonEmptyString
      .regex(/^[a-z0-9][a-z0-9-]*$/)
      .optional(),
    description: nonEmptyString,
    known_refs: z.array(nonEmptyString).default([]),
    defaults: videoIntakeDefaultsSchema.optional(),
    presenter_provider: nonEmptyString.optional(),
  })
  .strict();

export const videoIntakeDecisionSchema = z
  .object({
    status: z.enum(["draft_ready", "needs_clarification", "blocked"]),
    draft_job: videoJobSchema.nullable(),
    missing_fields: z.array(nonEmptyString),
    questions: z.array(nonEmptyString),
    assumptions: z.array(nonEmptyString),
    next_action: nonEmptyString,
  })
  .strict();

export type VideoIntakeRequest = z.infer<typeof videoIntakeRequestSchema>;
export type VideoIntakeDecision = z.infer<typeof videoIntakeDecisionSchema>;

const refRequiredSourceTypes = new Set<VideoJob["source"]["type"]>([
  "existing-video",
  "music",
  "deck",
  "github-pr",
  "remotion-project",
]);

export const createVideoIntakeDecision = (
  input: unknown,
): VideoIntakeDecision => {
  const request = videoIntakeRequestSchema.parse(input);
  const sourceType = resolveSourceType(request.description);
  const missingFields = getMissingFields(request, sourceType);

  if (missingFields.length > 0) {
    return videoIntakeDecisionSchema.parse({
      status: "needs_clarification",
      draft_job: null,
      missing_fields: missingFields,
      questions: missingFields.map(getQuestion),
      assumptions: [],
      next_action:
        "Collect the missing fields before creating a draft Video Job.",
    });
  }

  const draft = buildDraftJob(request, sourceType);
  const parsedDraft = videoJobSchema.safeParse(draft);

  if (!parsedDraft.success) {
    return videoIntakeDecisionSchema.parse({
      status: "blocked",
      draft_job: null,
      missing_fields: [],
      questions: [],
      assumptions: [],
      next_action: parsedDraft.error.issues
        .map((issue) => issue.message)
        .join("; "),
    });
  }

  return videoIntakeDecisionSchema.parse({
    status: "draft_ready",
    draft_job: parsedDraft.data,
    missing_fields: [],
    questions: [],
    assumptions: getAssumptions(request),
    next_action:
      "Ask the user to review the draft Job. After confirmation, enable VIDEO_AGENT_PLATFORM and run video:route.",
  });
};

const getMissingFields = (
  request: VideoIntakeRequest,
  sourceType: VideoJob["source"]["type"],
): string[] => {
  const missingFields: string[] = [];

  if (!request.defaults?.duration_seconds) {
    missingFields.push("defaults.duration_seconds");
  }
  if (!request.defaults?.aspect_ratio) {
    missingFields.push("defaults.aspect_ratio");
  }
  if (!request.defaults?.language) {
    missingFields.push("defaults.language");
  }
  if (
    refRequiredSourceTypes.has(sourceType) &&
    request.known_refs.length === 0
  ) {
    missingFields.push("known_refs");
  }
  if (requestsDigitalHuman(request.description) && !request.presenter_provider) {
    missingFields.push("presenter_provider");
  }

  return missingFields;
};

const buildDraftJob = (
  request: VideoIntakeRequest,
  sourceType: VideoJob["source"]["type"],
): VideoJob => {
  const defaults = request.defaults!;
  const digitalHuman = requestsDigitalHuman(request.description);

  return {
    job_id: request.request_id ?? "video-job-draft",
    workflow: requestsShortRepackage(request.description)
      ? "shorts-repackage"
      : "auto",
    source: {
      type: sourceType,
      subject: request.description,
      refs: request.known_refs,
    },
    output: defaults,
    presenter: digitalHuman
      ? { mode: "digital-human", provider: request.presenter_provider! }
      : { mode: "none" },
    render: { engine: "auto" },
    review_gates: {
      script: "pending",
      storyboard: "pending",
      final_render: "pending",
    },
  };
};

const resolveSourceType = (
  description: string,
): VideoJob["source"]["type"] => {
  if (usesExistingVideo(description)) {
    return "existing-video";
  }
  if (usesGithubPr(description)) {
    return "github-pr";
  }
  if (usesMusic(description)) {
    return "music";
  }
  if (usesDeck(description)) {
    return "deck";
  }
  if (usesRemotionProject(description)) {
    return "remotion-project";
  }
  if (usesMotionBrief(description)) {
    return "motion-brief";
  }
  if (/(产品|官网|网站|应用|app|saas|宣传片|promo)/i.test(description)) {
    return "product-brief";
  }
  return "topic";
};

const usesExistingVideo = (description: string): boolean =>
  /(已有|现有).{0,12}(视频|成片|长视频)|长视频|本地成片|existing[- ]?video|footage/i.test(
    description,
  );

const usesGithubPr = (description: string): boolean =>
  /(github\.com\/.+\/pull\/\d+|pull request|\bPR\b|拉取请求)/i.test(
    description,
  );

const usesMusic = (description: string): boolean =>
  /(节拍|卡点|music[- ]?video|按.*(?:鼓点|节奏)|跟着.*(?:音乐|歌))/i.test(
    description,
  );

const usesDeck = (description: string): boolean =>
  /(pitch\s*deck|演示文稿|幻灯片|\bpptx?\b|\.pdf\b|路演)/i.test(description);

const usesRemotionProject = (description: string): boolean =>
  /(remotion.+(迁移|移植|port)|(?:迁移|移植|port).+remotion)/i.test(
    description,
  );

const usesMotionBrief = (description: string): boolean =>
  /(logo\s*sting|短动效|数据\s*hit|片头贴纸|motion[- ]?graphics)/i.test(
    description,
  );

const requestsShortRepackage = (description: string): boolean =>
  /(短视频|拆条|剪成|切片|repackage)/i.test(description);

const requestsDigitalHuman = (description: string): boolean =>
  /(数字人|digital[ -]?human|avatar)/i.test(description);

const getQuestion = (field: string): string => {
  const questions: Record<string, string> = {
    "defaults.duration_seconds":
      "What target duration in seconds should the draft use?",
    "defaults.aspect_ratio": "What output aspect ratio should the draft use?",
    "defaults.language": "What output language should the draft use?",
    known_refs:
      "Which approved local source file paths should the Job reference?",
    presenter_provider:
      "Which explicitly approved digital-human provider should the Job use?",
  };

  return questions[field] ?? `Provide ${field}.`;
};

const getAssumptions = (request: VideoIntakeRequest): string[] => [
  "All review gates remain pending.",
  "No source rights, provider approval, or final-render approval is implied by this draft.",
  ...(request.known_refs.length > 0
    ? [
        "Known refs were provided by the caller and were not verified or modified.",
      ]
    : []),
];
