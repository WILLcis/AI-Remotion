import type { HotspotClip, HotspotFormat, HotspotPack } from "../schemas/hotspot";

const CN_INDEX = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

export const clipIndexLabel = (index: number): string =>
  CN_INDEX[index - 1] ?? String(index);

export const formatZhDateLabel = (now: Date, timeZone = "Asia/Shanghai"): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = parts.find((part) => part.type === "month")?.value ?? "1";
  const day = parts.find((part) => part.type === "day")?.value ?? "1";
  return `${month}月${day}日`;
};

export const formatHotspotMarkdown = (pack: HotspotPack): string => {
  const heading =
    pack.format === "digital-human"
      ? `热门数字人口播文案 - ${pack.date_label}（即梦版）`
      : `热门口播文案 - ${pack.date_label}`;
  const clips = pack.clips.map((clip) => formatClip(pack.format, clip)).join("\n");
  const sources = pack.clips
    .flatMap((clip) => clip.sources)
    .map((item) =>
      [`- ${item.title}`, item.source ? `（${item.source}）` : "", item.url ? ` ${item.url}` : ""]
        .join("")
        .trim(),
    );
  const sourceBlock =
    sources.length > 0
      ? `\n素材来源（公开报道整理，待核，勿当已核实事实）\n${sources.join("\n")}\n`
      : "";
  return `${heading}\n${clips}${sourceBlock}`;
};

const formatClip = (format: HotspotFormat, clip: HotspotClip): string => {
  const lines = [
    `口播${clipIndexLabel(clip.index)}：${clip.headline}`,
    "爆款标题",
    clip.hook_title,
    "封面文案",
    clip.cover,
    "话题标签",
    clip.tags,
  ];
  if (format === "digital-human") {
    lines.push("即梦提示词", clip.dreamina_prompt ?? "");
  }
  lines.push("口播文本", clip.spoken);
  return lines.join("\n");
};
