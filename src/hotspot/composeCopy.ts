import {
  DEFAULT_DREAMINA_PRESENTER_PROMPT,
  type HotspotClip,
  type HotspotItem,
  type HotspotPack,
  type HotspotRequest,
} from "../schemas/hotspot";
import { formatZhDateLabel } from "./formatPack";
import { sanitizeHotspotPack } from "./safeCopy";

const limitChars = (text: string, max: number): string => {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
};

const firstSentence = (text: string): string => {
  const match = text.trim().match(/^[^。！？!?]{8,}[。！？!?]?/);
  return limitChars(match?.[0] ?? text.trim(), 48);
};

const spokenFromItem = (item: HotspotItem): string => {
  const summary = item.summary.trim().replace(/\s+/g, "");
  const spoken = summary.endsWith("？") || summary.endsWith("?")
    ? summary
    : `${summary}你怎么看？`;
  return limitChars(spoken, 180);
};

const tagsFrom = (topic: string, item: HotspotItem): string => {
  const extra = item.title
    .replace(/[，。！？、\s]/g, " ")
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && part.length <= 8)
    .slice(0, 2);
  const tags = [`#${topic.replace(/\s+/g, "")}`, ...extra.map((part) => `#${part}`)];
  return [...new Set(tags)].slice(0, 4).join(" ");
};

export const composeHotspotPack = (
  request: HotspotRequest,
  now = new Date(),
): HotspotPack => {
  const selected = request.items.slice(0, request.count);
  if (selected.length === 0) {
    throw new Error("Hotspot pack requires at least one search item");
  }
  const presenter =
    request.presenter_prompt?.trim() || DEFAULT_DREAMINA_PRESENTER_PROMPT;
  const clips: HotspotClip[] = selected.map((item, index) => ({
    index: index + 1,
    headline: limitChars(item.title, 40),
    hook_title: limitChars(item.title, 48),
    cover: firstSentence(item.summary),
    tags: tagsFrom(request.topic, item),
    spoken: spokenFromItem(item),
    dreamina_prompt:
      request.format === "digital-human" ? presenter : undefined,
    sources: [item],
  }));

  return sanitizeHotspotPack({
    format: request.format,
    topic: request.topic,
    date_label: request.date ?? formatZhDateLabel(now),
    clips,
  });
};

const presenterLook = (clip: HotspotClip): string =>
  clip.dreamina_prompt?.trim() || DEFAULT_DREAMINA_PRESENTER_PROMPT;

/** Seedance prompt: first-frame cover + spoken lip-sync + on-screen Chinese captions. */
export const buildDreaminaVideoPrompt = (clip: HotspotClip): string =>
  [
    presenterLook(clip),
    "以这张图作为视频第一帧，人物从封面姿态开口说话。",
    "人物对镜头用中文口播，嘴唇明显开合，口型跟随对白，下颌活动，不要闭嘴静止，不要只眨眼。",
    "画面底部叠加清晰可读、无错别字的中文字幕，字幕必须与口播逐句一致，白字深色半透明底，不要挡住脸和嘴。",
    `口播与字幕：${clip.spoken}`,
  ].join("");

export const estimateSpokenDurationSeconds = (spoken: string): number => {
  const chars = spoken.replace(/\s/g, "").length;
  return Math.min(15, Math.max(5, Math.ceil(chars / 4)));
};
