import { describe, expect, it } from "vitest";
import { RPA_CHROME_LAUNCH } from "../src/publish/rpaPublish";
import {
  isPrimaryPublishLabel,
  rpaPageLooksSuccessful,
} from "../src/publish/rpaSignals";

describe("RPA publish signals", () => {
  it("uses installed Chrome, not Incognito or bundled Chromium", () => {
    expect(RPA_CHROME_LAUNCH.channel).toBe("chrome");
    expect(RPA_CHROME_LAUNCH.headless).toBe(false);
    expect(RPA_CHROME_LAUNCH.ignoreDefaultArgs).toContain("--enable-automation");
    expect(JSON.stringify(RPA_CHROME_LAUNCH)).not.toMatch(/incognito/i);
  });

  it("treats 发表成功 / 发布成功 as posted", () => {
    expect(
      rpaPageLooksSuccessful(
        "https://channels.weixin.qq.com/platform/post/create",
        "发表成功",
      ),
    ).toBe(true);
    expect(
      rpaPageLooksSuccessful(
        "https://creator.xiaohongshu.com/publish/publish",
        "笔记发布成功",
      ),
    ).toBe(true);
  });

  it("does not treat the composer page as posted", () => {
    expect(
      rpaPageLooksSuccessful(
        "https://channels.weixin.qq.com/platform/post/create",
        "发表 定时发表 保存草稿",
      ),
    ).toBe(false);
    expect(
      rpaPageLooksSuccessful(
        "https://creator.xiaohongshu.com/publish/publish",
        "发布 存草稿",
      ),
    ).toBe(false);
  });

  it("only treats the exact 发表/发布 labels as the primary action", () => {
    expect(isPrimaryPublishLabel("发表")).toBe(true);
    expect(isPrimaryPublishLabel("发布")).toBe(true);
    expect(isPrimaryPublishLabel("定时发表")).toBe(false);
    expect(isPrimaryPublishLabel("确认发布")).toBe(false);
  });
});
