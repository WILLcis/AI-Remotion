import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FLAGS, LocalProvider } from "../flags/feature-flags";
import { composeHotspotPack } from "../src/hotspot/composeCopy";
import { formatHotspotMarkdown } from "../src/hotspot/formatPack";
import { missingHotspotFields, runHotspot } from "../src/hotspot/runHotspot";
import { listDueScheduledHotspot, listScheduledHotspot } from "../src/hotspot/schedule";
import { parseDreaminaSubmitId } from "../src/media/dreaminaCli";
import { hotspotRequestSchema } from "../src/schemas/hotspot";
import items from "./fixtures/hotspot/items.json";

const tempDir = (): string => mkdtempSync(path.join(tmpdir(), "ai-remotion-hotspot-"));

const enabled = async () => true;
const disabled = async () => false;

describe("video hotspot digest", () => {
  it("keeps the hotspot flag killed by default", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_HOTSPOT]: { enabled: false },
    });
    await expect(provider.isEnabled(FLAGS.VIDEO_HOTSPOT, {}, true)).resolves.toBe(
      false,
    );
  });

  it("asks for format and topic instead of inventing them", async () => {
    expect(missingHotspotFields({})).toEqual(["format", "topic"]);
    const result = await runHotspot(
      {},
      { isEnabled: enabled, outDir: tempDir() },
    );
    expect(result.status).toBe("needs_clarification");
    expect(result.questions.join("\n")).toMatch(/human-vo|digital-human/);
  });

  it("asks the agent to search before writing copy", async () => {
    const result = await runHotspot(
      { format: "human-vo", topic: "商业消费", items: [] },
      { isEnabled: enabled, outDir: tempDir() },
    );
    expect(result.status).toBe("needs_search");
    expect(result.missing_fields).toContain("items");
  });

  it("writes human-vo copy without Dreamina prompt or video generation", async () => {
    const generated: string[] = [];
    const result = await runHotspot(
      {
        format: "human-vo",
        topic: "商业消费",
        items,
        date: "8月4日",
      },
      {
        isEnabled: enabled,
        outDir: tempDir(),
        generateVideo: async ({ clip }) => {
          generated.push(clip.headline);
          return { video_path: "/tmp/none.mp4" };
        },
      },
    );
    expect(result.status).toBe("done");
    expect(result.format).toBe("human-vo");
    expect(result.markdown).toMatch(/^热门口播文案 - 8月4日/m);
    expect(result.markdown).toMatch(/口播一：/);
    expect(result.markdown).toMatch(/口播文本/);
    expect(result.markdown).not.toMatch(/即梦提示词/);
    expect(result.next_action).toMatch(/themselves|自己/i);
    expect(generated).toEqual([]);
    expect(readFileSync(result.pack_path!, "utf8")).toMatch(/素材来源/);
  });

  it("writes digital-human copy with the example presenter prompt and then generates", async () => {
    const published: string[] = [];
    const result = await runHotspot(
      {
        format: "digital-human",
        topic: "商业消费",
        items,
        date: "8月4日",
        count: 2,
      },
      {
        isEnabled: enabled,
        outDir: tempDir(),
        generateVideo: async ({ clip }) => ({
          video_path: `/tmp/clip-${clip.index}.mp4`,
          cover_path: `/tmp/clip-${clip.index}-cover.png`,
        }),
        publishVideo: async ({ clip, cover_path }) => {
          published.push(`${clip.hook_title}|${cover_path ?? ""}`);
          return { status: "packed" };
        },
      },
    );
    expect(result.status).toBe("done");
    expect(result.markdown).toMatch(/热门数字人口播文案 - 8月4日（即梦版）/);
    expect(result.markdown).toMatch(/即梦提示词/);
    expect(result.markdown).toMatch(/无边框眼镜/);
    expect(result.generated_videos).toEqual([
      "/tmp/clip-1.mp4",
      "/tmp/clip-2.mp4",
    ]);
    expect(published).toHaveLength(2);
    expect(published.every((row) => row.includes("-cover.png"))).toBe(true);
  });

  it("does not call Dreamina when digital-human pack_only is set", async () => {
    let called = false;
    const result = await runHotspot(
      {
        format: "digital-human",
        topic: "科技",
        items,
        pack_only: true,
      },
      {
        isEnabled: enabled,
        outDir: tempDir(),
        generateVideo: async () => {
          called = true;
          return { video_path: "/tmp/x.mp4" };
        },
      },
    );
    expect(result.status).toBe("done");
    expect(called).toBe(false);
    expect(result.next_action).toMatch(/text2video/);
  });

  it("queues a daily job without searching yet", async () => {
    const dir = tempDir();
    const result = await runHotspot(
      {
        format: "human-vo",
        topic: "本地民生",
        repeat: "daily",
        daily_time: "08:00",
      },
      {
        isEnabled: enabled,
        outDir: dir,
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("scheduled");
    expect(listScheduledHotspot(path.join(dir, "scheduled"))).toHaveLength(1);
    expect(
      listDueScheduledHotspot(
        path.join(dir, "scheduled"),
        new Date("2026-08-12T23:00:00.000Z"),
      ),
    ).toEqual([]);
  });

  it("blocks when the hotspot kill switch is off", async () => {
    const result = await runHotspot(
      { format: "human-vo", topic: "商业消费", items },
      { isEnabled: disabled, outDir: tempDir() },
    );
    expect(result.status).toBe("blocked");
  });

  it("formats packs to the example.md field order", () => {
    const pack = composeHotspotPack(
      hotspotRequestSchema.parse({
        format: "digital-human",
        topic: "商业消费",
        items: items.slice(0, 1),
        count: 1,
        date: "8月4日",
      }),
    );
    const markdown = formatHotspotMarkdown(pack);
    expect(markdown.indexOf("爆款标题")).toBeLessThan(markdown.indexOf("封面文案"));
    expect(markdown.indexOf("封面文案")).toBeLessThan(markdown.indexOf("话题标签"));
    expect(markdown.indexOf("话题标签")).toBeLessThan(markdown.indexOf("即梦提示词"));
    expect(markdown.indexOf("即梦提示词")).toBeLessThan(markdown.indexOf("口播文本"));
  });

  it("parses Dreamina submit_id from CLI JSON", () => {
    expect(parseDreaminaSubmitId('{"submit_id":"abc-123","gen_status":"querying"}')).toBe(
      "abc-123",
    );
  });

  it("keeps long source titles intact in the deterministic fallback", () => {
    const pack = composeHotspotPack(
      hotspotRequestSchema.parse({
        format: "human-vo",
        topic: "数字货币",
        count: 1,
        items: [
          {
            title: "高盛和NEOS推出22.5亿美元比特币收益ETF",
            summary: "高盛与NEOS推出比特币收益ETF，规模约22.5亿美元。",
            url: "https://example.com/etf",
          },
        ],
      }),
    );
    expect(pack.clips[0]?.headline).toContain("比特币收益ETF");
    expect(pack.clips[0]?.headline).not.toMatch(/收益E$/);
  });

  it("applies LLM polish to spoken copy for both formats", async () => {
    const result = await runHotspot(
      {
        format: "human-vo",
        topic: "商业消费",
        items: items.slice(0, 1),
        date: "8月4日",
        count: 1,
      },
      {
        isEnabled: enabled,
        outDir: tempDir(),
        polishPack: async (pack) => ({
          ...pack,
          clips: pack.clips.map((clip) => ({
            ...clip,
            spoken: "工资没涨，谋生工具先贵了，你说谁最亏？",
            hook_title: "3样东西偷偷涨价，打工人被迫给AI交税了",
          })),
        }),
      },
    );
    expect(result.status).toBe("done");
    expect(result.markdown).toMatch(/工资没涨，谋生工具先贵了/);
  });
});
