import { describe, expect, it } from "vitest";
import {
  evaluateRpaPace,
  RPA_MAX_POSTS_PER_DAY,
  type RpaPaceEntry,
} from "../src/publish/rpaPace";

const noon = (): Date => {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now;
};

const night = (): Date => {
  const now = new Date();
  now.setHours(23, 30, 0, 0);
  return now;
};

const entry = (
  overrides: Partial<RpaPaceEntry> & Pick<RpaPaceEntry, "at">,
): RpaPaceEntry => ({
  platform: "weixin-channels",
  video_sha256: "aaa",
  account_alias: "default",
  ...overrides,
});

describe("RPA pace", () => {
  it("blocks overnight posting", () => {
    const decision = evaluateRpaPace({
      entries: [],
      now: night(),
      platform: "xiaohongshu",
      videoSha256: "aaa",
    });
    expect(decision).toMatchObject({ ok: false, code: "rpa_night" });
  });

  it("blocks after the daily cap", () => {
    const at = noon();
    at.setHours(11, 0, 0, 0);
    const entries = Array.from({ length: RPA_MAX_POSTS_PER_DAY }, (_, index) =>
      entry({
        at: at.toISOString(),
        platform: index % 2 === 0 ? "weixin-channels" : "xiaohongshu",
        video_sha256: `clip-${index}`,
      }),
    );
    const decision = evaluateRpaPace({
      entries,
      now: noon(),
      platform: "weixin-channels",
      videoSha256: "next",
    });
    expect(decision).toMatchObject({ ok: false, code: "rpa_daily_cap" });
  });

  it("blocks a different clip posted too soon", () => {
    const now = noon();
    const recent = new Date(now.getTime() - 10 * 60 * 1000);
    const decision = evaluateRpaPace({
      entries: [entry({ at: recent.toISOString(), video_sha256: "other" })],
      now,
      platform: "xiaohongshu",
      videoSha256: "aaa",
    });
    expect(decision).toMatchObject({ ok: false, code: "rpa_too_soon" });
    if (decision.ok === false) {
      expect(decision.sameClipOtherPlatform).toBe(false);
    }
  });

  it("allows the other platform for the same clip after a short wait", () => {
    const now = noon();
    const recent = new Date(now.getTime() - 30 * 1000);
    const blocked = evaluateRpaPace({
      entries: [entry({ at: recent.toISOString() })],
      now,
      platform: "xiaohongshu",
      videoSha256: "aaa",
    });
    expect(blocked).toMatchObject({
      ok: false,
      code: "rpa_too_soon",
      sameClipOtherPlatform: true,
    });
    if (blocked.ok === false) {
      expect(blocked.waitMs).toBeGreaterThan(0);
    }
    const later = evaluateRpaPace({
      entries: [entry({ at: recent.toISOString() })],
      now: new Date(now.getTime() + 3 * 60 * 1000),
      platform: "xiaohongshu",
      videoSha256: "aaa",
    });
    expect(later).toEqual({ ok: true });
  });

  it("allows the first daytime post", () => {
    expect(
      evaluateRpaPace({
        entries: [],
        now: noon(),
        platform: "weixin-channels",
        videoSha256: "aaa",
      }),
    ).toEqual({ ok: true });
  });
});
