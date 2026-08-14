import { describe, expect, it } from "vitest";
import {
  assertDreaminaAvailable,
  DEFAULT_DREAMINA_VIDEO_MODEL,
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

  it("defaults text2video to seedance2.0_vip instead of Fast", async () => {
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
    expect(DEFAULT_DREAMINA_VIDEO_MODEL).toBe("seedance2.0_vip");
    expect(calls[0]).toEqual(
      expect.arrayContaining(["--model_version=seedance2.0_vip"]),
    );
    expect(calls[0]?.join(" ")).not.toMatch(/seedance2\.0fast/);
  });
});
