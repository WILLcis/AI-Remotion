import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FLAGS } from "../flags/feature-flags";
import { loadRuntimeConfig } from "../src/config/runtimeConfig";
import { crawlHotspotItems, parseRssItems } from "../src/hotspot/crawl";
import { polishHotspotPack } from "../src/hotspot/polishCopy";
import { composeHotspotPack } from "../src/hotspot/composeCopy";
import { runHotspot } from "../src/hotspot/runHotspot";
import { watchHotspot } from "../src/hotspot/watch";
import { hotspotRequestSchema } from "../src/schemas/hotspot";
import items from "./fixtures/hotspot/items.json";

const tempDir = (): string => mkdtempSync(path.join(tmpdir(), "ai-remotion-hotspot-"));
const rssXml = readFileSync(
  path.join(process.cwd(), "tests/fixtures/hotspot/rss-sample.xml"),
  "utf8",
);

describe("hotspot LLM polish", () => {
  it("merges OpenAI-compatible JSON onto the pack and keeps sources", async () => {
    const pack = composeHotspotPack(
      hotspotRequestSchema.parse({
        format: "digital-human",
        topic: "商业消费",
        items: items.slice(0, 1),
        count: 1,
        date: "8月4日",
      }),
    );
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_API_KEY: "test-key",
        AI_REMOTION_LLM_BASE_URL: "https://api.deepseek.com",
        AI_REMOTION_LLM_MODEL: "deepseek-v4-flash",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });
    const polished = await polishHotspotPack(pack, {
      config: config.llm,
      request: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    clips: [
                      {
                        index: 1,
                        headline: "打工人三件套涨价",
                        hook_title: "3样东西偷偷涨价，打工人被迫给AI交税了",
                        cover_keyword: "AI税",
                        cover: "工资没涨，谋生工具先贵了",
                        tags: "#打工人三件套 #手机涨价 #AI税 #商业思维",
                        spoken:
                          "3样东西偷偷涨价，手机涨三百，电脑涨一千，电动车都贵了两百。巨头吃肉，打工人买单，你说谁最亏？",
                      },
                    ],
                  }),
                },
              },
            ],
          }),
        ),
    });
    expect(polished.provider).toBe("openai-compatible");
    expect(polished.pack.clips[0]?.cover).toBe("工资没涨，谋生工具先贵了");
    expect(polished.pack.clips[0]?.cover_keyword).toBe("AI税");
    expect(polished.pack.clips[0]?.sources[0]?.url).toBe("https://example.com/ai-tax");
    expect(polished.pack.clips[0]?.dreamina_prompt).toMatch(/无边框眼镜/);
  });

  it("falls back to the template pack when polish JSON is invalid", async () => {
    const pack = composeHotspotPack(
      hotspotRequestSchema.parse({
        format: "human-vo",
        topic: "商业消费",
        items: items.slice(0, 1),
        count: 1,
      }),
    );
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_API_KEY: "test-key",
        AI_REMOTION_LLM_BASE_URL: "https://api.deepseek.com",
        AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC: "true",
        AI_REMOTION_LLM_MODEL: "deepseek-v4-flash",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });
    const polished = await polishHotspotPack(pack, {
      config: config.llm,
      request: async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: "not json" } }],
          }),
        ),
    });
    expect(polished.provider).toBe("deterministic");
    expect(polished.reason).toBe("fallback");
    expect(polished.pack.clips[0]?.headline).toBe(pack.clips[0]?.headline);
  });
});

describe("hotspot RSS crawler", () => {
  it("parses RSS items and keeps only fresh topic matches", async () => {
    expect(parseRssItems(rssXml, "Fixture")[0]?.title).toMatch(/Bitcoin ETF/);
    const crawled = await crawlHotspotItems({
      topic: "数字货币",
      count: 3,
      now: new Date("2026-08-12T12:00:00.000Z"),
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => rssXml,
      }),
    });
    expect(crawled.map((item) => item.title)).toEqual([
      "Bitcoin ETF income fund draws $2.25 billion",
    ]);
    expect(crawled[0]?.source).toBeDefined();
  });

  it("refuses to start the resident crawler when its kill switch is off", async () => {
    await expect(
      watchHotspot({
        isEnabled: async (key) => key === FLAGS.VIDEO_HOTSPOT,
        scheduleDir: tempDir(),
        outDir: tempDir(),
        searchItems: async () => [],
      }),
    ).rejects.toThrow(/FLAG_video_hotspot_crawler/);
  });

  it("crawls due jobs then LLM-polishes copy on one watch tick", async () => {
    const dir = tempDir();
    const scheduleDir = path.join(dir, "scheduled");
    const outDir = path.join(dir, "out");
    await runHotspot(
      {
        format: "human-vo",
        topic: "数字货币",
        repeat: "daily",
        daily_time: "08:00",
      },
      {
        isEnabled: async () => true,
        outDir,
        scheduleDir,
      },
    );
    let ticks = 0;
    await watchHotspot({
      isEnabled: async () => true,
      scheduleDir,
      outDir,
      packOnly: true,
      searchItems: async () => items.slice(0, 1),
      polishPack: async (pack) => ({
        ...pack,
        clips: pack.clips.map((clip) => ({
          ...clip,
          spoken: "精修后的口播，你怎么看？",
        })),
      }),
      now: () => new Date("2026-08-12T12:00:00.000Z"),
      shouldContinue: () => ticks < 1,
      onTick: () => {
        ticks += 1;
      },
      sleep: async () => undefined,
    });
    const markdown = readFileSync(path.join(outDir, "hotspot-copy.md"), "utf8");
    expect(markdown).toMatch(/精修后的口播/);
    expect(ticks).toBe(1);
  });
});
