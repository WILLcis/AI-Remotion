import { z } from "zod";

/**
 * User-facing video generation / composition services.
 * Agents must ask the user to pick one before synthesizing; never invent a default.
 * The chosen service owns the **entire** final composition path (exclusive).
 */
export const videoGenerationServiceSchema = z.enum([
  "remotion",
  "hyperframes",
  "heygen",
  "dreamina",
]);

export type VideoGenerationService = z.infer<
  typeof videoGenerationServiceSchema
>;

export type VideoGenerationTtsPolicy =
  | "project-tts"
  | "heygen-native"
  | "dreamina-native";

export type VideoGenerationServiceInfo = {
  id: VideoGenerationService;
  kind: "local-compose" | "cloud-generate";
  paid: boolean;
  label_zh: string;
  label_en: string;
  summary_zh: string;
  exclusive_zh: string;
  tts: VideoGenerationTtsPolicy;
  tts_zh: string;
};

export const VIDEO_GENERATION_SERVICES: readonly VideoGenerationServiceInfo[] =
  [
    {
      id: "remotion",
      kind: "local-compose",
      paid: false,
      label_zh: "Remotion（本地模板合成）",
      label_en: "Remotion (local template compose)",
      summary_zh: "整条成片只走 Remotion：brief→script→storyboard→voice→captions→MP4。",
      exclusive_zh: "禁止混用 HyperFrames / HeyGen / 即梦出最终成片。",
      tts: "project-tts",
      tts_zh:
        "项目 TTS：`AI_REMOTION_TTS_*`（推荐 CosyVoice 3 / cosyvoice-clone；也可 silent、macos-say 等）。",
    },
    {
      id: "hyperframes",
      kind: "local-compose",
      paid: false,
      label_zh: "HyperFrames（本地 HTML 合成）",
      label_en: "HyperFrames (local HTML compose)",
      summary_zh: "整条成片只走 HyperFrames：脚本/分镜/配音后本地 HF 渲染。",
      exclusive_zh: "禁止混用 Remotion / HeyGen / 即梦出最终成片。",
      tts: "project-tts",
      tts_zh:
        "项目 TTS：`AI_REMOTION_TTS_*`（推荐 CosyVoice 3 / cosyvoice-clone；也可 silent 等）。",
    },
    {
      id: "heygen",
      kind: "cloud-generate",
      paid: true,
      label_zh: "HeyGen Video Agent / Avatar（云端付费）",
      label_en: "HeyGen Video Agent / Avatar (paid cloud)",
      summary_zh: "整条成片只走 HeyGen：最终 MP4 以 HeyGen 下载件为准。",
      exclusive_zh: "禁止再用 Remotion/HyperFrames/即梦重做主成片（字幕烧录等后处理除外且须明示）。",
      tts: "heygen-native",
      tts_zh:
        "默认 HeyGen 自带音色/口播。仅当用户明确要求时，才可用项目 CosyVoice 替换音轨。",
    },
    {
      id: "dreamina",
      kind: "cloud-generate",
      paid: true,
      label_zh: "即梦 Dreamina CLI（云端付费）",
      label_en: "Dreamina / 即梦 CLI (paid cloud)",
      summary_zh:
        "选定即付费出片并发布：最终 MP4 只走即梦 CLI，不再停审稿/付费/发布门。",
      exclusive_zh:
        "禁止再用 Remotion/HyperFrames/HeyGen/火山 Seedance API 做最终成片。选定即梦=同意扣积分并随后发布。",
      tts: "dreamina-native",
      tts_zh:
        "默认即梦侧音频（模型/多模态自带）。不走项目 CosyVoice，除非用户明确要求后期换轨。",
    },
  ] as const;

export const getVideoGenerationServiceInfo = (
  service: VideoGenerationService,
): VideoGenerationServiceInfo => {
  const info = VIDEO_GENERATION_SERVICES.find((entry) => entry.id === service);
  if (!info) {
    throw new Error(`Unknown generation service: ${service}`);
  }
  return info;
};

export const isPaidVideoGenerationService = (
  service: VideoGenerationService,
): boolean => getVideoGenerationServiceInfo(service).paid;

export const skipsHumanApprovalGates = (
  service: VideoGenerationService | undefined,
): boolean => service === "dreamina";

export const formatVideoGenerationServiceChoicesZh = (): string =>
  VIDEO_GENERATION_SERVICES.map(
    (entry, index) =>
      `${index + 1}) ${entry.id} — ${entry.label_zh}${entry.paid ? "【付费】" : "【本地免费】"}：${entry.summary_zh} TTS：${entry.tts_zh}`,
  ).join("\n");

export const videoGenerationServiceChoiceQuestionZh = (): string =>
  [
    "请选择本次视频合成服务（必选其一；选定后整条链路独占该服务，不要让我默认）：",
    formatVideoGenerationServiceChoicesZh(),
    "回复服务 id 即可，例如：remotion / hyperframes / heygen / dreamina。",
    "选 heygen 须另说：批准使用付费服务。",
    "选 dreamina：不再单独批准；立即生成并发布（抖音 API + 视频号/小红书清单）。",
  ].join("\n");

/** Exclusive final composition engine = the chosen generation.service. */
export const resolveExclusiveRenderer = (
  service: VideoGenerationService,
): VideoGenerationService => service;

export const resolveRenderEngineForGenerationService = (
  service: VideoGenerationService,
): "remotion" | "hyperframes" | "auto" => {
  if (service === "remotion") {
    return "remotion";
  }
  if (service === "hyperframes") {
    return "hyperframes";
  }
  // Cloud-exclusive paths keep local render.engine=auto; route.renderer carries heygen/dreamina.
  return "auto";
};
