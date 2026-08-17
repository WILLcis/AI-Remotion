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
  cover_keyword: "监管",
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
  it("builds a 9:16 cover prompt with a short keyword and two yellow lines", () => {
    const prompt = buildDreaminaCoverPrompt(clip);
    expect(prompt).toMatch(/9:16/);
    expect(prompt).toContain("监管");
    expect(prompt).toContain("8月20日");
    expect(prompt).toContain("CFTC开会谈加密");
    expect(prompt).not.toContain("加密货币要迎来大监管？");
    expect(prompt).toMatch(/封面/);
    expect(prompt).toMatch(/口型匹配/);
    expect(prompt).toMatch(/金色书法|黄字/);
    expect(prompt).toMatch(/黑描边/);
    expect(prompt).toMatch(/无半透明底条/);
    expect(prompt).toMatch(/恰好两行/);
    expect(prompt).not.toMatch(/ffmpeg/i);
  });

  it("copies only the face from the photo and uses the presenter look", async () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    const photoPath = path.join(dir, "dh1.jpg");
    writeFileSync(photoPath, "jpg");
    let image2imagePrompt = "";
    const coverPath = await generateDreaminaCover({
      clip,
      downloadDir: dir,
      approvePaid: true,
      photoPath,
      text2image: async () => {
        throw new Error("text2image should not run when sampling a user face");
      },
      image2image: async (input) => {
        image2imagePrompt = input.prompt;
        expect(input.imagePaths).toEqual([photoPath]);
        expect(input.ratio).toBe("9:16");
        return {
          code: 0,
          stdout: '{"submit_id":"face-submit","gen_status":"querying"}',
          stderr: "",
        };
      },
      queryResult: async ({ downloadDir }) => {
        writeFileSync(path.join(downloadDir, "face-submit_image_1.png"), "png");
        return { code: 0, stdout: '{"gen_status":"success"}', stderr: "" };
      },
    });
    expect(coverPath).toBe(path.join(dir, "face-submit_image_1.png"));
    expect(image2imagePrompt).toMatch(/人脸/);
    expect(image2imagePrompt).toMatch(/无边框眼镜/);
    expect(image2imagePrompt).toMatch(/正装|西装/);
    expect(image2imagePrompt).toMatch(/美颜|年轻|禁止沧桑/);
    expect(buildDreaminaCoverPrompt(clip, { identityFromPhoto: true })).toMatch(/人脸/);
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
