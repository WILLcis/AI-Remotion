import { hotspotPackSchema, type HotspotClip, type HotspotPack } from "../schemas/hotspot";

/** Soften copy that Dreamina TNS often rejects. Applied even when LLM polish is skipped. */
const REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/诈骗/g, "违规"],
  [/欺诈/g, "违规"],
  [/scam/gi, "misconduct"],
  [/fraud/gi, "misconduct"],
  [/判\s*\d+\s*年/g, "被处罚"],
  [/判刑/g, "处罚"],
  [/sentenced/gi, "penalized"],
  [/囚犯|阶下囚/g, "当事人"],
  [/prison/gi, "custody"],
  [/死刑/g, "重罚"],
  [/爆雷/g, "出事"],
  [/吃官司/g, "起了争议"],
  [/硬刚/g, "提出异议"],
  [/最高法院/g, "监管层"],
  [/吸血床虱|床虱/g, "卫生问题"],
];

export const sanitizeHotspotText = (text: string): string => {
  let next = text;
  for (const [pattern, replacement] of REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  return next.replace(/\s+/g, " ").trim();
};

export const sanitizeHotspotClip = (clip: HotspotClip): HotspotClip => ({
  ...clip,
  headline: sanitizeHotspotText(clip.headline) || clip.headline,
  hook_title: sanitizeHotspotText(clip.hook_title) || clip.hook_title,
  cover: sanitizeHotspotText(clip.cover) || clip.cover,
  tags: sanitizeHotspotText(clip.tags) || clip.tags,
  spoken: sanitizeHotspotText(clip.spoken) || clip.spoken,
});

export const sanitizeHotspotPack = (pack: HotspotPack): HotspotPack =>
  hotspotPackSchema.parse({
    ...pack,
    clips: pack.clips.map(sanitizeHotspotClip),
  });
