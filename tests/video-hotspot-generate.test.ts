import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateDigitalHumanClip,
  isDreaminaTnsFailure,
} from "../src/hotspot/generateClip";
import { DEFAULT_DREAMINA_PRESENTER_PROMPT } from "../src/schemas/hotspot";

const tempDir = (): string => mkdtempSync(path.join(tmpdir(), "ai-remotion-clip-"));

const clip = {
  index: 1,
  headline: "监管出手了",
  hook_title: "加密市场迎来新规则？",
  cover: "监管层开会谈行业规范",
  tags: "#数字货币 #监管",
  spoken: "监管层要开会了，行业规则可能要变，你怎么看？",
  dreamina_prompt: DEFAULT_DREAMINA_PRESENTER_PROMPT,
  sources: [{ title: "meeting", summary: "A meeting." }],
};

describe("hotspot digital-human clip generation", () => {
  it("detects Dreamina TNS failures", () => {
    expect(isDreaminaTnsFailure('{"msg":"TNS not pass"}')).toBe(true);
    expect(isDreaminaTnsFailure("未审核通过")).toBe(true);
    expect(isDreaminaTnsFailure("success")).toBe(false);
  });

  it("uses image2video from the cover with lip-sync and caption instructions in the prompt", async () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    const coverPath = path.join(dir, "cover.png");
    writeFileSync(coverPath, "png");
    const prompts: string[] = [];
    const result = await generateDigitalHumanClip({
      clip,
      downloadDir: dir,
      approvePaid: true,
      cover: async () => coverPath,
      image2video: async (input) => {
        prompts.push(input.prompt ?? "");
        expect(input.imagePath).toBe(coverPath);
        expect(input.prompt).toContain(clip.spoken);
        expect(input.prompt).toMatch(/字幕/);
        expect(input.prompt).toMatch(/口型|嘴唇/);
        expect(input.prompt).toMatch(/第一帧/);
        return { code: 0, stdout: '{"submit_id":"i2v-1"}', stderr: "" };
      },
      queryResult: async ({ downloadDir }) => {
        writeFileSync(path.join(downloadDir, "raw.mp4"), "mp4");
        return { code: 0, stdout: '{"gen_status":"success"}', stderr: "" };
      },
    });
    expect(prompts).toHaveLength(1);
    expect(result.cover_path).toBe(coverPath);
    expect(result.video_path).toBe(path.join(dir, "raw.mp4"));
  });

  it("throws immediately on TNS so the caller can skip the clip", async () => {
    const dir = tempDir();
    await expect(
      generateDigitalHumanClip({
        clip,
        downloadDir: dir,
        approvePaid: true,
        cover: async () => path.join(dir, "cover.png"),
        image2video: async () => ({
          code: 1,
          stdout: "",
          stderr: "TNS 未审核通过",
        }),
        queryResult: async () => ({ code: 0, stdout: "", stderr: "" }),
      }),
    ).rejects.toThrow(/TNS/);
  });
});
