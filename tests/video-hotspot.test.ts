import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FLAGS, LocalProvider } from "../flags/feature-flags";
import { resolveAudioTranscript } from "../src/hotspot/cloneVoice";
import {
  buildTalkingHeadClip,
  composeHotspotPack,
  buildDreaminaVideoPrompt,
} from "../src/hotspot/composeCopy";
import { formatHotspotMarkdown } from "../src/hotspot/formatPack";
import {
  DEFAULT_HOTSPOT_AUDIO_REL,
  DEFAULT_HOTSPOT_PHOTO_REL,
  resolveHotspotIdentity,
} from "../src/hotspot/identity";
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
    expect(result.next_action).toMatch(/image2video/);
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
    expect(markdown.indexOf("爆款标题")).toBeLessThan(markdown.indexOf("封面关键词"));
    expect(markdown.indexOf("封面关键词")).toBeLessThan(markdown.indexOf("封面文案"));
    expect(markdown.indexOf("封面文案")).toBeLessThan(markdown.indexOf("话题标签"));
    expect([...pack.clips[0]!.cover_keyword].length).toBeGreaterThanOrEqual(2);
    expect([...pack.clips[0]!.cover_keyword].length).toBeLessThanOrEqual(4);
    expect(pack.clips[0]!.cover.split(/[，,]/).length).toBe(2);
    expect([...pack.clips[0]!.cover.split(/[，,]/)[0]!].length).toBeLessThanOrEqual(12);
    expect(markdown.indexOf("话题标签")).toBeLessThan(markdown.indexOf("即梦提示词"));
    expect(markdown.indexOf("即梦提示词")).toBeLessThan(markdown.indexOf("口播文本"));
  });

  it("builds cover copy for agent talking-head without a scheduled hotspot pack", () => {
    const spoken = "央行今天开会了。市场在看利率怎么走。你怎么看？";
    const clip = buildTalkingHeadClip({ spoken });
    expect(clip.spoken).toBe(spoken);
    expect([...clip.cover_keyword].length).toBeGreaterThanOrEqual(2);
    expect([...clip.cover_keyword].length).toBeLessThanOrEqual(4);
    expect(clip.cover.split(/[，,]/).length).toBe(2);
    expect([...clip.cover.split(/[，,]/)[0]!].length).toBeLessThanOrEqual(12);
    const prompt = buildDreaminaVideoPrompt(clip, { identityFromPhoto: true });
    expect(prompt).toContain(`{${spoken}}`);
    expect(prompt).toMatch(/@Image 1 是封面静帧/);
    expect(prompt).toMatch(/必须作为视频第一帧/);
    expect(prompt).toMatch(/中英双语口播字幕/);
    expect(prompt).toMatch(/画面正下方居中/);
  });

  it("asks Dreamina to speak, lip-sync, and draw Chinese captions in the prompt", () => {
    const pack = composeHotspotPack(
      hotspotRequestSchema.parse({
        format: "digital-human",
        topic: "商业消费",
        items: items.slice(0, 1),
        count: 1,
      }),
    );
    const clip = pack.clips[0]!;
    const prompt = buildDreaminaVideoPrompt(clip);
    expect(prompt).toContain(clip.spoken);
    expect(prompt).toMatch(/口型匹配/);
    expect(prompt).toMatch(/中英双语字幕/);
    expect(prompt).toMatch(/正下方/);
    expect(prompt).toMatch(/第一帧/);
    expect(prompt).not.toMatch(/不要字幕|不要烧录字幕/);
    expect(clip.dreamina_prompt).toMatch(/口型匹配/);
    expect(clip.dreamina_prompt).toMatch(/字幕/);
    expect(clip.dreamina_prompt).not.toMatch(/不要修改内容/);
  });

  it("keeps the user face and the presenter look in the identity prompt", () => {
    const pack = composeHotspotPack(
      hotspotRequestSchema.parse({
        format: "digital-human",
        topic: "商业消费",
        items: items.slice(0, 1),
        count: 1,
      }),
    );
    const prompt = buildDreaminaVideoPrompt(pack.clips[0]!, {
      identityFromPhoto: true,
      audioTranscript: "参考录音原文。",
    });
    expect(prompt).toMatch(/@Image 1/);
    expect(prompt).toMatch(/@Image 2/);
    expect(prompt).toMatch(/第一帧/);
    expect(prompt).toMatch(/@Audio 1/);
    expect(prompt).toMatch(/口型匹配/);
    expect(prompt).toContain(`{${pack.clips[0]!.spoken}}`);
    expect(prompt).toMatch(/禁止复述/);
    expect(prompt).toContain("参考录音原文。");
    expect(prompt).toMatch(/无边框眼镜/);
    expect(prompt).toMatch(/人脸/);
    expect(prompt).toMatch(/正装|西装/);
    expect(prompt).toMatch(/年轻|禁止沧桑|美颜/);
  });

  it("rejects photo without audio", () => {
    expect(() =>
      hotspotRequestSchema.parse({
        format: "digital-human",
        topic: "商业消费",
        items: items.slice(0, 1),
        photo_path: "episodes/res/img/dh1.jpg",
      }),
    ).toThrow(/together/);
  });

  it("allows photo and audio without a reference transcript", () => {
    expect(
      hotspotRequestSchema.parse({
        format: "digital-human",
        topic: "商业消费",
        items: items.slice(0, 1),
        photo_path: "episodes/res/img/dh1.jpg",
        audio_path: "episodes/res/audio/dg1.wav",
      }).audio_path,
    ).toBe("episodes/res/audio/dg1.wav");
  });

  it("reads a .txt sidecar as the clone reference transcript", () => {
    const dir = tempDir();
    const audioPath = path.join(dir, "dg1.wav");
    writeFileSync(audioPath, "wav");
    writeFileSync(path.join(dir, "dg1.txt"), "参考录音原文。\n");
    expect(resolveAudioTranscript(audioPath)).toBe("参考录音原文。");
    expect(resolveAudioTranscript(audioPath, "命令行覆盖")).toBe("命令行覆盖");
  });

  it("applies the recorded default identity when no photo or audio is passed", () => {
    const dir = tempDir();
    mkdirSync(path.join(dir, "episodes/res/img"), { recursive: true });
    mkdirSync(path.join(dir, "episodes/res/audio"), { recursive: true });
    const photo = path.join(dir, DEFAULT_HOTSPOT_PHOTO_REL);
    const audio = path.join(dir, DEFAULT_HOTSPOT_AUDIO_REL);
    writeFileSync(photo, "jpg");
    writeFileSync(audio, "wav");
    writeFileSync(path.join(dir, "episodes/res/audio/dg1.txt"), "默认音色样本。\n");
    const identity = resolveHotspotIdentity({ cwd: dir, applyDefault: true });
    expect(identity.photo_path).toBe(photo);
    expect(identity.audio_path).toBe(audio);
    expect(identity.audio_transcript).toBe("默认音色样本。");
  });

  it("does not invent a default identity when the local files are missing", () => {
    expect(resolveHotspotIdentity({ cwd: tempDir(), applyDefault: true })).toEqual({});
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

  it("keeps generating later clips when one Dreamina TNS failure throws", async () => {
    const generated: number[] = [];
    const result = await runHotspot(
      {
        format: "digital-human",
        topic: "数字货币",
        items,
        date: "8月14日",
        count: 2,
      },
      {
        isEnabled: enabled,
        outDir: tempDir(),
        generateVideo: async ({ clip }) => {
          if (clip.index === 1) {
            throw new Error("即梦 TNS 审核失败：未审核通过");
          }
          generated.push(clip.index);
          return { video_path: `/tmp/clip-${clip.index}.mp4` };
        },
      },
    );
    expect(result.status).toBe("done");
    expect(generated).toEqual([2]);
    expect(result.generated_videos).toEqual(["/tmp/clip-2.mp4"]);
    expect(result.questions.join("\n")).toMatch(/口播1 即梦失败：.*TNS/);
    expect(result.next_action).toMatch(/口播1/);
  });

  it("marks digital-human failed when every clip throws", async () => {
    const result = await runHotspot(
      {
        format: "digital-human",
        topic: "数字货币",
        items: items.slice(0, 2),
        count: 2,
      },
      {
        isEnabled: enabled,
        outDir: tempDir(),
        generateVideo: async ({ clip }) => {
          throw new Error(`TNS clip ${clip.index}`);
        },
      },
    );
    expect(result.status).toBe("failed");
    expect(result.generated_videos).toEqual([]);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0]).toMatch(/口播1 即梦失败/);
    expect(result.questions[1]).toMatch(/口播2 即梦失败/);
  });

  it("softens TNS-sensitive words in titles and spoken copy", async () => {
    const result = await runHotspot(
      {
        format: "human-vo",
        topic: "数字货币",
        items: [
          {
            title: "韩国币圈又爆雷，CEO诈骗判15年",
            summary: "交易所欺诈，CEO成了阶下囚，最高法院也吃官司。",
          },
        ],
        count: 1,
        date: "8月14日",
      },
      { isEnabled: enabled, outDir: tempDir() },
    );
    const copy = result.markdown!.split("素材来源")[0] ?? "";
    expect(copy).not.toMatch(/诈骗|欺诈|判15年|阶下囚|爆雷|最高法院|吃官司/);
    expect(copy).toMatch(/违规|被处罚|当事人|出事/);
  });
});
