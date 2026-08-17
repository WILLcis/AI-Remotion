import {
  DEFAULT_DREAMINA_PRESENTER_PROMPT,
  type HotspotClip,
  type HotspotItem,
  type HotspotPack,
  type HotspotRequest,
} from "../schemas/hotspot";
import {
  DREAMINA_IDENTITY_LIPSYNC_REQUIREMENT,
  DREAMINA_IDENTITY_REQUIREMENT,
  DREAMINA_LIPSYNC_REQUIREMENT,
  DREAMINA_VIDEO_CAPTION_REQUIREMENT,
  clipCoverKeyword,
  coverKeywordFromTags,
  shortenCoverCopy,
  stripPresenterLook,
} from "./dreaminaStyle";
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

const coverKeywordFrom = (topic: string, item: HotspotItem, tags: string): string => {
  const fromTags = coverKeywordFromTags(topic, tags);
  if (fromTags) {
    return clipCoverKeyword(fromTags);
  }
  const fromTitle = [...item.title.replace(/[0-9a-zA-Z.,，。！？、\s]/g, "")]
    .slice(0, 4)
    .join("");
  if (fromTitle.length >= 2) {
    return fromTitle;
  }
  return clipCoverKeyword(topic);
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
  const clips: HotspotClip[] = selected.map((item, index) => {
    const tags = tagsFrom(request.topic, item);
    return {
      index: index + 1,
      headline: limitChars(item.title, 40),
      hook_title: limitChars(item.title, 48),
      cover_keyword: coverKeywordFrom(request.topic, item, tags),
      cover: shortenCoverCopy(firstSentence(item.summary)),
      tags,
      spoken: spokenFromItem(item),
      dreamina_prompt:
        request.format === "digital-human" ? presenter : undefined,
      sources: [item],
    };
  });

  return sanitizeHotspotPack({
    format: request.format,
    topic: request.topic,
    date_label: request.date ?? formatZhDateLabel(now),
    clips,
  });
};

const presenterLook = (clip: HotspotClip): string =>
  clip.dreamina_prompt?.trim() || DEFAULT_DREAMINA_PRESENTER_PROMPT;

/** Seedance prompt: cover first frame, or face+timbre references. */
export const buildDreaminaVideoPrompt = (
  clip: HotspotClip,
  options: { identityFromPhoto?: boolean; audioTranscript?: string } = {},
): string => {
  if (options.identityFromPhoto) {
    const transcript = options.audioTranscript?.trim();
    return [
      DREAMINA_IDENTITY_REQUIREMENT,
      `其余形象：${stripPresenterLook(presenterLook(clip))}。`,
      DREAMINA_IDENTITY_LIPSYNC_REQUIREMENT,
      DREAMINA_VIDEO_CAPTION_REQUIREMENT,
      transcript
        ? `参考音频原句是「${transcript}」，禁止复述这些原句。`
        : "参考音频只提供音色，禁止复述样本中的原句。",
      `人物用中文说：{${clip.spoken}}`,
    ].join("");
  }
  return [
    `${presenterLook(clip)}以这张图作为视频第一帧，人物从封面姿态开口说话。`,
    DREAMINA_LIPSYNC_REQUIREMENT,
    DREAMINA_VIDEO_CAPTION_REQUIREMENT,
    `口播与字幕：${clip.spoken}`,
  ].join("");
};

export const estimateSpokenDurationSeconds = (spoken: string, maxSeconds = 15): number => {
  const chars = spoken.replace(/\s/g, "").length;
  return Math.min(maxSeconds, Math.max(5, Math.ceil(chars / 4)));
};
