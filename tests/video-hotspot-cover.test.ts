import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDreaminaCoverPrompt,
  generateDreaminaCover,
  latestImage,
} from "../src/hotspot/cover";
import { DEFAULT_DREAMINA_PRESENTER_PROMPT } from "../src/schemas/hotspot";

const tempDir = (): string => mkdtempSync(path.join(tmpdir(), "ai-remotion-cover-"));

const clip = {
  index: 2,
  headline: "美国两大监管机构要管币圈了？",
  hook_title: "加密货币要迎来大监管？",
  cover: "8月20日，CFTC开会谈加密",
  tags: "#数字货币 #CFTC #SEC #监管",
  spoken: "美国CFTC，8月20号要开个会。",
  dreamina_prompt: DEFAULT_DREAMINA_PRESENTER_PROMPT,
  sources: [
    {
      title: "CFTC meeting",
      summary: "CFTC will hold a meeting.",
    },
  ],
};

describe("hotspot Dreamina cover", () => {
  it("builds a 9:16 cover prompt with hook title and cover copy", () => {
    const prompt = buildDreaminaCoverPrompt(clip);
    expect(prompt).toMatch(/9:16/);
    expect(prompt).toContain("加密货币要迎来大监管？");
    expect(prompt).toContain("8月20日，CFTC开会谈加密");
    expect(prompt).toMatch(/封面/);
    expect(prompt).not.toMatch(/ffmpeg/i);
  });

  it("downloads the Dreamina still via text2image then query_result", async () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    const coverPath = await generateDreaminaCover({
      clip,
      downloadDir: dir,
      approvePaid: true,
      text2image: async () => ({
        code: 0,
        stdout: '{"submit_id":"cover-submit","gen_status":"querying"}',
        stderr: "",
      }),
      queryResult: async ({ downloadDir }) => {
        writeFileSync(path.join(downloadDir, "cover-submit_image_1.png"), "png");
        return { code: 0, stdout: '{"gen_status":"success"}', stderr: "" };
      },
    });
    expect(coverPath).toBe(path.join(dir, "cover-submit_image_1.png"));
    expect(latestImage(dir)).toBe(coverPath);
  });

  it("refuses unpaid cover generation", async () => {
    await expect(
      generateDreaminaCover({
        clip,
        downloadDir: tempDir(),
        approvePaid: false,
      }),
    ).rejects.toThrow(/approvePaid/);
  });
});
