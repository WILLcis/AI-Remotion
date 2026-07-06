import { darkExplainerTheme } from "../../remotion/themes/defaultTheme";
import { secondsToFrames } from "../../render/duration";
import {
  renderPlanSchema,
  type Brief,
  type RenderPlan,
  type SceneType,
  type Storyboard,
} from "../../schemas";

const defaultSceneTypes: SceneType[] = [
  "title",
  "key_point",
  "image_card",
  "list",
  "comparison",
  "timeline",
  "quote",
  "cta",
];

type GenerateStoryboardOptions = {
  episodeId: string;
  script: string;
};

type GenerateRenderPlanOptions = {
  brief: Brief;
  episodeId: string;
  storyboard: Storyboard;
};

export type RevisionChangeType =
  | "script"
  | "visual"
  | "voice"
  | "captions"
  | "format"
  | "timing";

export type RevisionRoute = {
  artifacts: string[];
  changeType: RevisionChangeType;
  reason: string;
};

export const generateScriptFromBrief = (brief: Brief): string => {
  const sceneDurationSeconds = roundDuration(
    brief.duration_seconds / defaultSceneTypes.length,
  );
  const mustInclude = brief.must_include.join("；") || brief.topic;

  const scenes = [
    {
      caption: `${brief.topic}，先用一句话抓住重点。`,
      title: brief.topic,
      type: "title",
      visual: `标题卡，面向${brief.audience}，风格：${brief.visual_style}。`,
    },
    {
      caption: `这期内容围绕：${mustInclude}。`,
      title: "先确定核心信息",
      type: "key_point",
      visual: "用单个重点卡呈现本期必须讲清楚的概念。",
    },
    {
      caption: "用截图、概念卡或流程图给观众一个可视化锚点。",
      title: "给观众一个画面锚点",
      type: "image_card",
      visual: "展示一个图像卡片，承载截图、概念卡和流程箭头。",
    },
    {
      caption: "把复杂内容拆成三到四个容易跟上的步骤。",
      title: "拆成容易跟上的步骤",
      type: "list",
      visual: "列表卡，逐条展示脚本、分镜、渲染、复查。",
    },
    {
      caption: "对比手动制作和结构化生产，强调为什么值得模板化。",
      title: "对比两种做法",
      type: "comparison",
      visual: "左右对比：手动制作 vs 结构化生产。",
    },
    {
      caption: "把 brief、script、storyboard、render-plan 串成一条流水线。",
      title: "串起生产流程",
      type: "timeline",
      visual: "时间线展示从 brief 到 render-plan 的顺序。",
    },
    {
      caption: "先让内容可审，再让画面可渲染。",
      title: "保留一条生产原则",
      type: "quote",
      visual: "引用卡强调可审稿、可复现、可迭代。",
    },
    {
      caption: "最后输出可复用、可检查、可渲染的一期图文讲解视频。",
      title: "形成可复用输出",
      type: "cta",
      visual: "收尾 CTA，提示下一步生成 voiceover、captions 和 QA。",
    },
  ] satisfies Array<{
    caption: string;
    title: string;
    type: SceneType;
    visual: string;
  }>;

  return [
    `# ${brief.topic}`,
    "",
    "<!-- ai-remotion:script-status=draft -->",
    "",
    ...scenes.flatMap((scene, index) => [
      `## Segment ${index + 1}`,
      "",
      `Type: ${scene.type}`,
      "",
      `Title: ${scene.title}`,
      "",
      `Spoken: ${scene.caption}`,
      "",
      `Caption: ${scene.caption}`,
      "",
      `Visual: ${scene.visual}`,
      "",
      `Duration: ${sceneDurationSeconds}s`,
      "",
    ]),
  ].join("\n").trimEnd();
};

export const generateStoryboardFromScript = ({
  episodeId,
  script,
}: GenerateStoryboardOptions): Storyboard => {
  const segments = parseScriptSegments(script);

  return {
    duration_notes: "Generated from reviewable script scene durations.",
    episode_id: episodeId,
    scenes: segments.map((segment, index) => ({
      animation: animationForSceneType(segment.type),
      assets: [],
      caption: segment.caption,
      duration_seconds: segment.durationSeconds,
      id: `scene-${String(index + 1).padStart(2, "0")}`,
      narration: segment.spoken,
      visual_direction: segment.visual,
      visual_type: segment.type,
    })),
  };
};

export const generateRenderPlanFromStoryboard = ({
  brief,
  episodeId,
  storyboard,
}: GenerateRenderPlanOptions): RenderPlan => {
  const fps = 30;
  const isVertical = brief.aspect_ratio === "9:16";
  const video = {
    duration_frames: 0,
    fps,
    height: isVertical ? 1920 : 1080,
    safe_area: isVertical
      ? { bottom: 180, left: 72, right: 72, top: 120 }
      : { bottom: 96, left: 96, right: 96, top: 72 },
    width: isVertical ? 1080 : 1920,
  };

  let startFrame = 0;
  const scenes = storyboard.scenes.map((scene) => {
    const durationFrames = secondsToFrames(scene.duration_seconds, fps);
    const renderScene = {
      caption: scene.caption,
      duration_frames: durationFrames,
      duration_seconds: scene.duration_seconds,
      id: scene.id,
      narration: scene.narration,
      start_frame: startFrame,
      title: titleFromScene(scene.visual_direction, scene.caption),
      type: scene.visual_type,
      visual: visualForScene(scene.visual_type, scene, brief),
    };
    startFrame += durationFrames;
    return renderScene;
  });

  video.duration_frames = startFrame;

  return renderPlanSchema.parse({
    audio: {
      duration_seconds: null,
      voiceover_path: null,
    },
    captions: {
      enabled: true,
      items: scenes.map((scene) => ({
        end_frame: scene.start_frame + scene.duration_frames,
        start_frame: scene.start_frame,
        text: scene.caption,
      })),
    },
    episode_id: episodeId,
    metadata: {
      aspect_ratio: brief.aspect_ratio,
      duration_seconds: video.duration_frames / fps,
      language: "zh",
      platform: brief.platform,
      subtitle: brief.audience,
      title: brief.topic,
    },
    scenes,
    theme: darkExplainerTheme,
    video,
  });
};

export const routeRevisionRequest = (request: string): RevisionRoute => {
  const normalized = request.toLowerCase();

  if (matchesAny(normalized, ["voice", "男声", "女声", "配音", "旁白音色"])) {
    return {
      artifacts: ["render-plan.json", "audio/voiceover.wav", "captions.srt"],
      changeType: "voice",
      reason: "Voice-only changes should regenerate audio and dependent timing.",
    };
  }

  if (matchesAny(normalized, ["字幕", "caption", "srt"])) {
    return {
      artifacts: ["render-plan.json", "captions.srt"],
      changeType: "captions",
      reason: "Caption wording/timing changes do not require script rewrites.",
    };
  }

  if (matchesAny(normalized, ["竖屏", "横屏", "9:16", "16:9", "format"])) {
    return {
      artifacts: ["render-plan.json"],
      changeType: "format",
      reason: "Output format changes should update render metadata and safe areas.",
    };
  }

  if (matchesAny(normalized, ["卡片", "时间轴", "画面", "视觉", "visual"])) {
    return {
      artifacts: ["storyboard.json", "render-plan.json"],
      changeType: "visual",
      reason: "Visual-only changes should avoid regenerating script or audio.",
    };
  }

  if (matchesAny(normalized, ["节奏", "太长", "压缩", "快", "慢", "timing"])) {
    return {
      artifacts: [
        "script.md",
        "storyboard.json",
        "render-plan.json",
        "captions.srt",
        "audio/voiceover.wav",
      ],
      changeType: "timing",
      reason: "Timing changes affect script density, frames, captions, and audio.",
    };
  }

  return {
    artifacts: [
      "script.md",
      "storyboard.json",
      "render-plan.json",
      "captions.srt",
      "audio/voiceover.wav",
    ],
    changeType: "script",
    reason: "Content changes start at the reviewable script and flow downstream.",
  };
};

type ScriptSegment = {
  caption: string;
  durationSeconds: number;
  spoken: string;
  type: SceneType;
  visual: string;
};

const parseScriptSegments = (script: string): ScriptSegment[] => {
  const blocks = script.split(/^## Segment \d+\s*$/gm).slice(1);

  if (blocks.length === 0) {
    throw new Error("Script must contain at least one '## Segment N' block");
  }

  return blocks.map((block, index) => ({
    caption: extractField(block, "Caption") || extractField(block, "Spoken"),
    durationSeconds: Number.parseFloat(extractField(block, "Duration")) || 3,
    spoken: extractField(block, "Spoken"),
    type: parseSceneType(extractField(block, "Type"), index),
    visual: extractField(block, "Visual"),
  }));
};

const extractField = (block: string, field: string): string => {
  const match = block.match(new RegExp(`^${field}:\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? "";
};

const parseSceneType = (value: string, index: number): SceneType => {
  const maybeType = value.trim() as SceneType;
  if (defaultSceneTypes.includes(maybeType)) {
    return maybeType;
  }

  return defaultSceneTypes[index % defaultSceneTypes.length];
};

const animationForSceneType = (sceneType: SceneType): string => {
  const animations: Record<SceneType, string> = {
    comparison: "Columns fade in together.",
    cta: "CTA card fades in.",
    image_card: "Image card lifts in with asset labels.",
    key_point: "Key card fades in.",
    list: "Rows enter as a group.",
    quote: "Quote rule expands, text fades in.",
    timeline: "Timeline steps enter from top to bottom.",
    title: "Title rises softly with signal line expansion.",
  };

  return animations[sceneType];
};

const titleFromScene = (visualDirection: string, caption: string): string => {
  return visualDirection.split(/[，。,.;]/)[0]?.trim() || caption;
};

const visualForScene = (
  sceneType: SceneType,
  scene: Storyboard["scenes"][number],
  brief: Brief,
): RenderPlan["scenes"][number]["visual"] => {
  switch (sceneType) {
    case "title":
      return {
        eyebrow: "AI-Remotion Draft",
        primary: brief.topic,
        secondary: scene.visual_direction,
      };

    case "key_point":
      return {
        primary: brief.must_include[0] ?? scene.caption,
        secondary: scene.visual_direction,
      };

    case "image_card":
      return {
        assets: ["截图", "概念卡", "流程图"],
        eyebrow: "Visual Evidence",
        primary: "图文证据",
        secondary: scene.visual_direction,
      };

    case "list":
      return {
        bullets:
          brief.must_include.length > 0
            ? brief.must_include
            : ["脚本", "分镜", "渲染", "复查"],
      };

    case "comparison":
      return {
        left_label: "手动制作",
        left_points: ["重复摆放", "难以复用", "修改成本高"],
        right_label: "结构化生产",
        right_points: ["文件驱动", "模板复用", "可检查"],
      };

    case "timeline":
      return {
        timeline_items: [
          { label: "1", text: "Brief" },
          { label: "2", text: "Script" },
          { label: "3", text: "Render" },
        ],
      };

    case "quote":
      return {
        attribution: "AI-Remotion workflow",
        quote: scene.caption,
      };

    case "cta":
      return {
        primary: "reviewable script -> deterministic render",
        secondary: scene.visual_direction,
      };
  }
};

const matchesAny = (text: string, needles: string[]): boolean => {
  return needles.some((needle) => text.includes(needle));
};

const roundDuration = (seconds: number): number => {
  return Math.max(1, Math.round(seconds * 100) / 100);
};
