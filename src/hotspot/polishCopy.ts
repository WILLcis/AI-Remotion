import { z } from "zod";
import {
  generateTextWithProvider,
  type FetchLike,
} from "../agent/providers/llm";
import type { LlmRuntimeConfig } from "../config/runtimeConfig";
import { hotspotPackSchema, type HotspotPack } from "../schemas/hotspot";
import {
  clipCoverKeyword,
  coverKeywordFromTags,
  shortenCoverCopy,
} from "./dreaminaStyle";
import { sanitizeHotspotPack } from "./safeCopy";

const polishedClipSchema = z.object({
  index: z.number().int().min(1).optional(),
  headline: z.string().trim().min(1),
  hook_title: z.string().trim().min(1),
  cover_keyword: z.string().trim().min(1).optional(),
  cover: z.string().trim().min(1),
  tags: z.string().trim().min(1),
  spoken: z.string().trim().min(1),
});

const polishedPayloadSchema = z.object({
  clips: z.array(polishedClipSchema).min(1),
});

export type PolishHotspotPack = (pack: HotspotPack) => Promise<HotspotPack>;

export type PolishHotspotResult = {
  pack: HotspotPack;
  provider: string;
  reason: string;
};

const SYSTEM_PROMPT = `你是短视频口播文案编辑。把给定新闻素材改写成口播稿，口吻对齐下列样例：

爆款标题：3样东西偷偷涨价，打工人被迫给AI交税了
封面关键词：AI税
封面文案：工资没涨，谋生工具先贵了
话题标签：#打工人三件套 #手机涨价 #AI税 #商业思维
口播文本：3样东西偷偷涨价，手机涨三百，电脑涨一千，电动车都贵了两百。不是品牌黑心，是AI把芯片产能全抢走了。巨头吃肉，打工人买单，你说谁最亏？

规则：
- 只改写 headline / hook_title / cover_keyword / cover / tags / spoken。
- cover_keyword 必须是这篇口播的真正重点，恰好 2 到 4 个汉字（如「AI税」「芯片」）。禁止把无关字硬拼成一个词（禁止「涨税」这种把涨价和交税揉在一起）。不要写整句，不要用话题名凑数。
- cover 恰好两句短分句，用中文逗号隔开，每句不超过 12 字。样例：「工资没涨，谋生工具先贵了」。禁止把爆款标题整句印到封面，hook_title 只给平台标题用。
- 禁止编造素材里没有的数字、机构、金额、日期或结论。不确定就写得更保守。
- 口播像人在说话：短句、有态度、结尾抛问。数字人口播 spoken 不超过 90 字。
- 即梦会审核标题和口播：禁止写诈骗、欺诈、判刑、囚犯、死刑、血腥、色情、吸毒、政治对抗、点名辱骂。改成监管、处罚、调查、行业事件等中性说法。不要写具体刑期。
- 标题短、少感叹号、不恐吓。
- 真人口播不要写即梦提示词。
- 只输出 JSON：{"clips":[{"index":1,"headline":"...","hook_title":"...","cover_keyword":"...","cover":"...","tags":"#a #b","spoken":"..."}]}`;

export const parsePolishedClipsJson = (text: string) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced?.[1] ?? text).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("LLM hotspot polish did not return JSON.");
  }
  return polishedPayloadSchema.parse(JSON.parse(raw.slice(start, end + 1)));
};

export const mergePolishedPack = (
  pack: HotspotPack,
  polished: z.infer<typeof polishedPayloadSchema>,
): HotspotPack => {
  if (polished.clips.length !== pack.clips.length) {
    throw new Error(
      `LLM hotspot polish returned ${polished.clips.length} clips, expected ${pack.clips.length}.`,
    );
  }
  return sanitizeHotspotPack(
    hotspotPackSchema.parse({
      ...pack,
      clips: pack.clips.map((clip, index) => {
        const next = polished.clips[index];
        if (!next) {
          throw new Error(`LLM hotspot polish missing clip ${clip.index}.`);
        }
        return {
          ...clip,
          headline: next.headline,
          hook_title: next.hook_title,
          cover_keyword: clipCoverKeyword(
            next.cover_keyword
              ?? coverKeywordFromTags(pack.topic, next.tags)
              ?? clip.cover_keyword,
          ),
          cover: shortenCoverCopy(next.cover),
          tags: next.tags,
          spoken: next.spoken,
        };
      }),
    }),
  );
};

export const polishHotspotPack = async (
  pack: HotspotPack,
  options: {
    config: LlmRuntimeConfig;
    request?: FetchLike;
  },
): Promise<PolishHotspotResult> => {
  const generated = await generateTextWithProvider({
    config: options.config,
    deterministicText: () => JSON.stringify({ clips: pack.clips }),
    request: options.request,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify(
          {
            format: pack.format,
            topic: pack.topic,
            date_label: pack.date_label,
            clips: pack.clips.map((clip) => ({
              index: clip.index,
              sources: clip.sources,
              draft: {
                headline: clip.headline,
                hook_title: clip.hook_title,
                cover_keyword: clip.cover_keyword,
                cover: clip.cover,
                tags: clip.tags,
                spoken: clip.spoken,
              },
            })),
          },
          null,
          2,
        ),
      },
    ],
  });

  if (generated.provider === "deterministic") {
    return {
      pack,
      provider: generated.provider,
      reason: generated.reason,
    };
  }

  try {
    return {
      pack: mergePolishedPack(pack, parsePolishedClipsJson(generated.text)),
      provider: generated.provider,
      reason: generated.reason,
    };
  } catch (error) {
    if (!options.config.fallbackToDeterministic) {
      throw error;
    }
    return {
      pack,
      provider: "deterministic",
      reason: "fallback",
    };
  }
};

export const createLlmPolishPack = (options: {
  config: LlmRuntimeConfig;
  request?: FetchLike;
}): PolishHotspotPack => {
  return async (pack) => {
    const polished = await polishHotspotPack(pack, options);
    return sanitizeHotspotPack(polished.pack);
  };
};
