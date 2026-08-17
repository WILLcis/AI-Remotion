import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertDreaminaAvailable,
  DEFAULT_DREAMINA_VIDEO_MODEL,
  dreaminaImage2Image,
  dreaminaMultimodal2Video,
  dreaminaText2Image,
  dreaminaText2Video,
} from "../src/media/dreaminaCli";

describe("dreamina CLI adapter", () => {
  it("refuses paid text2image without explicit approval", async () => {
    await expect(
      dreaminaText2Image({
        approvePaid: false,
        downloadDir: "/tmp/dreamina-test",
        prompt: "test",
        options: {
          run: async () => ({ code: 0, stdout: "", stderr: "" }),
        },
      }),
    ).rejects.toThrow(/approvePaid/);
  });

  it("runs text2image after approval through the injected runner", async () => {
    const calls: string[][] = [];
    const result = await dreaminaText2Image({
      approvePaid: true,
      downloadDir: "/tmp/dreamina-test",
      prompt: "交易所夜景",
      ratio: "9:16",
      options: {
        bin: "dreamina",
        run: async (_bin, args) => {
          calls.push(args);
          return { code: 0, stdout: '{"gen_status":"success"}', stderr: "" };
        },
      },
    });

    expect(result.code).toBe(0);
    expect(calls[0]).toEqual(
      expect.arrayContaining([
        "text2image",
        "--prompt=交易所夜景",
        "--ratio=9:16",
      ]),
    );
    expect(calls[0]).not.toEqual(expect.arrayContaining([expect.stringMatching(/download_dir/)]));
  });

  it("refuses paid text2video without explicit approval", async () => {
    await expect(
      dreaminaText2Video({
        approvePaid: false,
        prompt: "test",
      }),
    ).rejects.toThrow(/approvePaid/);
  });

  it("surfaces a clear install hint when dreamina -h fails", async () => {
    await expect(
      assertDreaminaAvailable({
        run: async () => ({
          code: 127,
          stdout: "",
          stderr: "command not found",
        }),
      }),
    ).rejects.toThrow(/jimeng\.jianying\.com\/cli/);
  });

  it("defaults text2video to seedance2.0fast", async () => {
    const calls: string[][] = [];
    await dreaminaText2Video({
      approvePaid: true,
      prompt: "口播",
      options: {
        run: async (_bin, args) => {
          calls.push(args);
          return { code: 0, stdout: '{"submit_id":"x"}', stderr: "" };
        },
      },
    });
    expect(DEFAULT_DREAMINA_VIDEO_MODEL).toBe("seedance2.0fast");
    expect(calls[0]).toEqual(
      expect.arrayContaining(["--model_version=seedance2.0fast"]),
    );
  });

  it("refuses paid image2image without explicit approval", async () => {
    await expect(
      dreaminaImage2Image({
        approvePaid: false,
        downloadDir: "/tmp/dreamina-i2i",
        imagePaths: ["/tmp/face.jpg"],
        prompt: "sample this face",
      }),
    ).rejects.toThrow(/approvePaid/);
  });

  it("passes the source photo to image2image after approval", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ai-remotion-i2i-"));
    const imagePath = path.join(dir, "face.jpg");
    writeFileSync(imagePath, "jpg");
    const calls: string[][] = [];
    await dreaminaImage2Image({
      approvePaid: true,
      downloadDir: dir,
      imagePaths: [imagePath],
      prompt: "采样同一人物",
      ratio: "9:16",
      options: {
        run: async (_bin, args) => {
          calls.push(args);
          return { code: 0, stdout: '{"submit_id":"i2i"}', stderr: "" };
        },
      },
    });
    expect(calls[0]).toEqual(
      expect.arrayContaining([
        "image2image",
        "--prompt=采样同一人物",
        "--ratio=9:16",
        expect.stringMatching(/--images=.*face\.jpg/),
      ]),
    );
  });

  it("refuses paid multimodal2video without explicit approval", async () => {
    await expect(
      dreaminaMultimodal2Video({
        approvePaid: false,
        imagePaths: ["/tmp/cover.png"],
        audioPaths: ["/tmp/spoken.wav"],
      }),
    ).rejects.toThrow(/approvePaid/);
  });

  it("passes cover image and driving audio to multimodal2video", async () => {
    const dir = mkdtempSync(path.join(tmpdir(), "ai-remotion-mm-"));
    mkdirSync(dir, { recursive: true });
    const imagePath = path.join(dir, "cover.png");
    const audioPath = path.join(dir, "spoken.wav");
    writeFileSync(imagePath, "png");
    writeFileSync(audioPath, "wav");
    const calls: string[][] = [];
    await dreaminaMultimodal2Video({
      approvePaid: true,
      imagePaths: [imagePath],
      audioPaths: [audioPath],
      prompt: "口型跟随音频",
      durationSeconds: 8,
      ratio: "9:16",
      options: {
        run: async (_bin, args) => {
          calls.push(args);
          return { code: 0, stdout: '{"submit_id":"m"}', stderr: "" };
        },
      },
    });
    expect(calls[0]).toEqual(
      expect.arrayContaining([
        "multimodal2video",
        "--prompt=口型跟随音频",
        "--ratio=9:16",
        "--model_version=seedance2.0fast",
        expect.stringMatching(/--image=.*cover\.png/),
        expect.stringMatching(/--audio=.*spoken\.wav/),
      ]),
    );
  });
});
