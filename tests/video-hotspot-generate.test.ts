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
  cover_keyword: "监管",
  cover: "监管层开会，行业规范要变",
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
        expect(input.prompt).toMatch(/口型匹配/);
        expect(input.prompt).toMatch(/字幕/);
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

  it("uses Seedance 2.0 Fast face and timbre references, not CosyVoice or the sample's original words", async () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    const photoPath = path.join(dir, "dh1.jpg");
    const coverPath = path.join(dir, "cover.png");
    const audioPath = path.join(dir, "dg1.wav");
    writeFileSync(photoPath, "jpg");
    writeFileSync(coverPath, "png");
    writeFileSync(audioPath, "wav");
    let usedMultimodal = false;
    const result = await generateDigitalHumanClip({
      clip,
      downloadDir: dir,
      approvePaid: true,
      photoPath,
      audioPath,
      audioTranscript: "这是参考录音的逐字稿。",
      cover: async (input) => {
        expect(input.photoPath).toBe(photoPath);
        return coverPath;
      },
      prepareAudio: async (input) => {
        expect(input.audioPath).toBe(audioPath);
        expect(input.maxSeconds).toBe(15);
        expect(input.minSeconds).toBe(5);
        writeFileSync(input.outputWav, "wav");
        return { durationSeconds: 19, outputPath: input.outputWav };
      },
      multimodal: async (input) => {
        usedMultimodal = true;
        expect(input.imagePaths).toEqual([coverPath, photoPath]);
        expect(input.audioPaths?.[0]).toMatch(/voice-ref\.wav$/);
        expect(input.modelVersion).toBe("seedance2.0fast");
        expect(input.prompt).toMatch(/@Image 1/);
        expect(input.prompt).toMatch(/@Image 2/);
        expect(input.prompt).toMatch(/第一帧/);
        expect(input.prompt).toMatch(/@Audio 1/);
        expect(input.prompt).toContain(`{${clip.spoken}}`);
        expect(input.prompt).toMatch(/音色/);
        expect(input.prompt).toMatch(/禁止复述/);
        expect(input.prompt).toContain("这是参考录音的逐字稿。");
        expect(input.prompt).toMatch(/口型匹配/);
        expect(input.prompt).toMatch(/无边框眼镜/);
        expect(input.prompt).toMatch(/人脸/);
        expect(input.prompt).toMatch(/正装|西装/);
        expect(input.prompt).toMatch(/年轻|禁止沧桑|美颜/);
        expect(input.prompt).toMatch(/正下方/);
        return { code: 0, stdout: '{"submit_id":"id-1"}', stderr: "" };
      },
      image2video: async () => {
        throw new Error("image2video should not run when photo+audio are set");
      },
      queryResult: async ({ downloadDir }) => {
        writeFileSync(path.join(downloadDir, "raw.mp4"), "mp4");
        return { code: 0, stdout: "", stderr: "" };
      },
    });
    expect(usedMultimodal).toBe(true);
    expect(result.cover_path).toBe(coverPath);
    expect(result.video_path).toBe(path.join(dir, "raw.mp4"));
  });

  it("passes an explicit video model override to multimodal2video", async () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    const photoPath = path.join(dir, "dh1.jpg");
    const coverPath = path.join(dir, "cover.png");
    const audioPath = path.join(dir, "dg1.wav");
    writeFileSync(photoPath, "jpg");
    writeFileSync(coverPath, "png");
    writeFileSync(audioPath, "wav");
    let modelVersion: string | undefined;
    await generateDigitalHumanClip({
      clip,
      downloadDir: dir,
      approvePaid: true,
      photoPath,
      audioPath,
      modelVersion: "seedance2.0_vip",
      cover: async () => coverPath,
      prepareAudio: async (input) => {
        writeFileSync(input.outputWav, "wav");
        return { durationSeconds: 8, outputPath: input.outputWav };
      },
      multimodal: async (input) => {
        modelVersion = input.modelVersion;
        return { code: 0, stdout: '{"submit_id":"vip-1"}', stderr: "" };
      },
      image2video: async () => {
        throw new Error("image2video should not run when photo+audio are set");
      },
      queryResult: async ({ downloadDir }) => {
        writeFileSync(path.join(downloadDir, "vip.mp4"), "mp4");
        return { code: 0, stdout: "", stderr: "" };
      },
    });
    expect(modelVersion).toBe("seedance2.0_vip");
  });

  it("rejects photo without audio", async () => {
    const dir = tempDir();
    writeFileSync(path.join(dir, "dh1.jpg"), "jpg");
    await expect(
      generateDigitalHumanClip({
        clip,
        downloadDir: dir,
        approvePaid: true,
        photoPath: path.join(dir, "dh1.jpg"),
      }),
    ).rejects.toThrow(/together/);
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
