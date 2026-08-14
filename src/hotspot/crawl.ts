import { z } from "zod";
import { hotspotItemSchema, type HotspotItem } from "../schemas/hotspot";

export type RssFetch = (url: string) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

const feedSchema = z.object({
  url: z.string().trim().min(1),
  source: z.string().trim().min(1).optional(),
  keywords: z.array(z.string().trim().min(1)).optional(),
});

export const hotspotCrawlerConfigSchema = z.object({
  feeds: z.array(feedSchema).min(1),
  max_age_hours: z.number().int().min(1).max(168).default(36),
  topic_keywords: z.record(z.string(), z.array(z.string().trim().min(1))).default(
    {},
  ),
});

export type HotspotCrawlerConfig = z.infer<typeof hotspotCrawlerConfigSchema>;

export const DEFAULT_HOTSPOT_CRAWLER_CONFIG: HotspotCrawlerConfig =
  hotspotCrawlerConfigSchema.parse({
    feeds: [
      {
        url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
        source: "CoinDesk",
      },
      {
        url: "https://cointelegraph.com/rss",
        source: "Cointelegraph",
      },
      {
        url: "https://36kr.com/feed",
        source: "36氪",
      },
    ],
    max_age_hours: 36,
    topic_keywords: {
      数字货币: ["bitcoin", "crypto", "btc", "比特币", "加密", "稳定币", "sec", "etf"],
      商业消费: ["涨价", "消费", "酒店", "平台", "罚款", "零售"],
      科技: ["ai", "芯片", "苹果", "华为", "大模型"],
    },
  });

export type ParsedRssItem = {
  title: string;
  summary: string;
  url?: string;
  source?: string;
  published_at?: string;
  publishedMs: number;
};

const decodeEntities = (text: string): string =>
  text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

const stripHtml = (text: string): string =>
  decodeEntities(text)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tagValue = (block: string, tag: string): string => {
  const match = block.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*([\\s\\S]*?)\\s*</${tag}>`, "i"),
  );
  return match?.[1] ? stripHtml(match[1]) : "";
};

export const parseRssItems = (xml: string, source?: string): ParsedRssItem[] => {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return blocks
    .map((block) => {
      const title = tagValue(block, "title");
      const summary =
        tagValue(block, "description") ||
        tagValue(block, "content:encoded") ||
        title;
      const url = tagValue(block, "link") || undefined;
      const publishedRaw =
        tagValue(block, "pubDate") ||
        tagValue(block, "published") ||
        tagValue(block, "dc:date");
      const publishedMs = publishedRaw ? Date.parse(publishedRaw) : Date.now();
      return {
        title,
        summary: summary.slice(0, 280),
        url,
        source: source || tagValue(block, "source") || undefined,
        published_at: Number.isFinite(publishedMs)
          ? new Date(publishedMs).toISOString()
          : undefined,
        publishedMs: Number.isFinite(publishedMs) ? publishedMs : Date.now(),
      };
    })
    .filter((item) => item.title.length > 0 && item.summary.length > 0);
};

const matchesKeywords = (item: ParsedRssItem, keywords: string[]): boolean => {
  if (keywords.length === 0) {
    return true;
  }
  const haystack = `${item.title} ${item.summary}`.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
};

export const filterCrawledItems = (
  items: ParsedRssItem[],
  input: {
    topic: string;
    count: number;
    now?: Date;
    maxAgeHours: number;
    topicKeywords: Record<string, string[]>;
  },
): HotspotItem[] => {
  const nowMs = (input.now ?? new Date()).getTime();
  const maxAgeMs = input.maxAgeHours * 60 * 60 * 1000;
  const keywords = [
    input.topic,
    ...(input.topicKeywords[input.topic] ?? []),
  ].filter((keyword, index, all) => all.indexOf(keyword) === index);
  const fresh = items
    .filter((item) => nowMs - item.publishedMs <= maxAgeMs)
    .filter((item) => matchesKeywords(item, keywords))
    .sort((left, right) => right.publishedMs - left.publishedMs);

  const seen = new Set<string>();
  const unique: HotspotItem[] = [];
  for (const item of fresh) {
    const key = (item.url ?? item.title).toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(
      hotspotItemSchema.parse({
        title: item.title,
        summary: item.summary,
        url: item.url,
        source: item.source,
        published_at: item.published_at,
      }),
    );
    if (unique.length >= input.count) {
      break;
    }
  }
  return unique;
};

export const crawlHotspotItems = async (input: {
  topic: string;
  count: number;
  config?: HotspotCrawlerConfig;
  fetchImpl?: RssFetch;
  now?: Date;
}): Promise<HotspotItem[]> => {
  const config = hotspotCrawlerConfigSchema.parse(
    input.config ?? DEFAULT_HOTSPOT_CRAWLER_CONFIG,
  );
  const fetchImpl = input.fetchImpl ?? fetch;
  const parsed: ParsedRssItem[] = [];
  for (const feed of config.feeds) {
    try {
      const response = await fetchImpl(feed.url);
      if (!response.ok) {
        continue;
      }
      parsed.push(...parseRssItems(await response.text(), feed.source));
    } catch {
      continue;
    }
  }
  return filterCrawledItems(parsed, {
    topic: input.topic,
    count: input.count,
    now: input.now,
    maxAgeHours: config.max_age_hours,
    topicKeywords: config.topic_keywords,
  });
};
