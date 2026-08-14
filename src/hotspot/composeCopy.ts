import {
  DEFAULT_DREAMINA_PRESENTER_PROMPT,
  type HotspotClip,
  type HotspotItem,
  type HotspotPack,
  type HotspotRequest,
} from "../schemas/hotspot";
import { formatZhDateLabel } from "./formatPack";

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

  return {
    format: request.format,
    topic: request.topic,
    date_label: request.date ?? formatZhDateLabel(now),
    clips,
  };
};

export const buildDreaminaVideoPrompt = (clip: HotspotClip): string =>
  `${clip.dreamina_prompt ?? DEFAULT_DREAMINA_PRESENTER_PROMPT}\n他用中文口播：${clip.spoken}`;

export const estimateSpokenDurationSeconds = (spoken: string): number => {
  const chars = spoken.replace(/\s/g, "").length;
  return Math.min(15, Math.max(5, Math.ceil(chars / 4)));
};
