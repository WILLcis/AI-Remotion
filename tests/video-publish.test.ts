import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FLAGS, LocalProvider } from "../flags/feature-flags";
import { routeVideoJob } from "../src/agent/videoRouter";
import type { DouyinClient } from "../src/publish/douyin";
import { runDueScheduledPublish, runPublish } from "../src/publish/runPublish";
import { listDueScheduledPublish } from "../src/publish/schedule";
import { resolvePublishPlatforms } from "../src/publish/schema";

const tempDir = (): string => mkdtempSync(path.join(tmpdir(), "ai-remotion-publish-"));

const writeVideo = (dir: string): string => {
  const filePath = path.join(dir, "final.mp4");
  writeFileSync(filePath, Buffer.from("fake-mp4"));
  return filePath;
};

const enabled = async () => true;
const disabled = async () => false;

const mockDouyin = (): DouyinClient & { uploads: string[]; creates: string[] } => {
  const uploads: string[] = [];
  const creates: string[] = [];
  return {
    uploads,
    creates,
    async uploadVideo({ filePath }) {
      uploads.push(filePath);
      return { video_id: "vid-1" };
    },
    async createVideo({ videoId }) {
      creates.push(videoId);
      return { item_id: "item-1", video_id: videoId };
    },
  };
};

const requestBase = (dir: string) => ({
  approve_publish: true as const,
  platform: "douyin" as const,
  title: "测试标题",
  video_path: writeVideo(dir),
  account_alias: "default",
  topics: ["AI"],
});

describe("video publish", () => {
  it("keeps the RPA kill switch off by default", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_PUBLISH_RPA]: { enabled: false },
    });
    await expect(
      provider.isEnabled(FLAGS.VIDEO_PUBLISH_RPA, {}, true),
    ).resolves.toBe(false);
  });

  it("keeps publish flags killed by default", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_PUBLISH]: { enabled: false },
      [FLAGS.VIDEO_PUBLISH_DOUYIN]: { enabled: false },
    });
    await expect(provider.isEnabled(FLAGS.VIDEO_PUBLISH, {}, true)).resolves.toBe(
      false,
    );
    await expect(
      provider.isEnabled(FLAGS.VIDEO_PUBLISH_DOUYIN, {}, true),
    ).resolves.toBe(false);
  });

  it("blocks Douyin writes when the kill switch is off", async () => {
    const dir = tempDir();
    const douyin = mockDouyin();
    const result = await runPublish(requestBase(dir), {
      auditPath: path.join(dir, "audit.jsonl"),
      douyin,
      isEnabled: disabled,
      scheduleDir: path.join(dir, "scheduled"),
    });
    expect(result.status).toBe("blocked");
    expect(douyin.uploads).toEqual([]);
    expect(douyin.creates).toEqual([]);
  });

  it("uploads and creates immediately when flags and approval are present", async () => {
    const dir = tempDir();
    const douyin = mockDouyin();
    const result = await runPublish(requestBase(dir), {
      auditPath: path.join(dir, "audit.jsonl"),
      douyin,
      env: {
        AI_REMOTION_DOUYIN_ACCESS_TOKEN: "act.test",
        AI_REMOTION_DOUYIN_OPEN_ID: "openid-test",
      },
      isEnabled: enabled,
      scheduleDir: path.join(dir, "scheduled"),
    });
    expect(result.status).toBe("submitted");
    expect(result.platform_post_id).toBe("item-1");
    expect(douyin.uploads).toHaveLength(1);
    expect(douyin.creates).toEqual(["vid-1"]);
    const audit = readFileSync(path.join(dir, "audit.jsonl"), "utf8");
    expect(audit).not.toMatch(/act\.test|token|secret/i);
  });

  it("queues future Douyin schedule_at locally without calling create_video", async () => {
    const dir = tempDir();
    const douyin = mockDouyin();
    const later = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const result = await runPublish(
      { ...requestBase(dir), schedule_at: later },
      {
        auditPath: path.join(dir, "audit.jsonl"),
        douyin,
        isEnabled: enabled,
        now: new Date("2026-08-13T00:00:00.000Z"),
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("scheduled");
    expect(douyin.creates).toEqual([]);
    expect(listDueScheduledPublish(path.join(dir, "scheduled"), new Date("2026-08-13T00:00:00.000Z"))).toEqual([]);
  });

  it("submits due scheduled Douyin jobs through --due semantics", async () => {
    const dir = tempDir();
    const douyin = mockDouyin();
    const scheduleDir = path.join(dir, "scheduled");
    const later = "2026-08-13T12:00:00.000Z";
    await runPublish(
      { ...requestBase(dir), schedule_at: later },
      {
        auditPath: path.join(dir, "audit.jsonl"),
        douyin,
        isEnabled: enabled,
        now: new Date("2026-08-13T00:00:00.000Z"),
        scheduleDir,
      },
    );
    const due = await runDueScheduledPublish({
      auditPath: path.join(dir, "audit.jsonl"),
      douyin,
      env: {
        AI_REMOTION_DOUYIN_ACCESS_TOKEN: "act.test",
        AI_REMOTION_DOUYIN_OPEN_ID: "openid-test",
      },
      isEnabled: enabled,
      now: new Date("2026-08-13T12:01:00.000Z"),
      scheduleDir,
    });
    expect(due).toHaveLength(1);
    expect(due[0]?.status).toBe("submitted");
    expect(douyin.creates).toEqual(["vid-1"]);
  });

  it("writes Weixin/Xiaohongshu assisted packs without HTTP", async () => {
    const dir = tempDir();
    const douyin = mockDouyin();
    const weixin = await runPublish(
      {
        ...requestBase(dir),
        platform: "weixin-channels",
        title: "视频号标题至少六字",
      },
      {
        auditPath: path.join(dir, "audit.jsonl"),
        douyin,
        isEnabled: enabled,
        packDir: path.join(dir, "pack"),
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(weixin.status).toBe("packed");
    expect(weixin.pack_path).toMatch(/weixin-channels\.json$/);
    const pack = JSON.parse(readFileSync(weixin.pack_path!, "utf8")) as {
      rpa: boolean;
      creator_url: string;
      cover_path: string | null;
    };
    expect(pack.rpa).toBe(false);
    expect(pack.creator_url).toContain("channels.weixin.qq.com");
    expect(pack.cover_path).toBeNull();
    expect(douyin.uploads).toEqual([]);
  });

  it("writes cover_path into assisted packs when a cover file is provided", async () => {
    const dir = tempDir();
    const coverPath = path.join(dir, "cover.jpg");
    writeFileSync(coverPath, Buffer.from("fake-jpg"));
    const packed = await runPublish(
      {
        ...requestBase(dir),
        platform: "xiaohongshu",
        title: "加密货币要迎来大监管？",
        cover_path: coverPath,
      },
      {
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: enabled,
        packDir: path.join(dir, "pack"),
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(packed.status).toBe("packed");
    const pack = JSON.parse(readFileSync(packed.pack_path!, "utf8")) as {
      cover_path: string;
      checklist: string[];
    };
    expect(pack.cover_path).toBe(coverPath);
    expect(pack.checklist.join("\n")).toMatch(/封面/);
  });

  it("does not run RPA when the flag is on without --i-accept-rpa-risk", async () => {
    const dir = tempDir();
    let rpaCalls = 0;
    const result = await runPublish(
      {
        ...requestBase(dir),
        platform: "weixin-channels",
        title: "视频号标题至少六字",
      },
      {
        acceptRpaRisk: false,
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: async () => true,
        packDir: path.join(dir, "pack"),
        rpaPublish: async () => {
          rpaCalls += 1;
          return { platform_post_id: "nope", message: "should not run" };
        },
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("packed");
    expect(rpaCalls).toBe(0);
    expect(result.message).toMatch(/i-accept-rpa-risk/);
  });

  it("does not run RPA when session approval is present but the kill switch is off", async () => {
    const dir = tempDir();
    let rpaCalls = 0;
    const result = await runPublish(
      {
        ...requestBase(dir),
        platform: "xiaohongshu",
        title: "加密货币要迎来大监管？",
      },
      {
        acceptRpaRisk: true,
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: async (key) => key !== FLAGS.VIDEO_PUBLISH_RPA,
        packDir: path.join(dir, "pack"),
        rpaPublish: async () => {
          rpaCalls += 1;
          return { platform_post_id: null, message: "should not run" };
        },
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("packed");
    expect(rpaCalls).toBe(0);
    expect(result.message).toMatch(/FLAG_video_publish_rpa/);
  });

  it("runs gated RPA after flag plus session approval and still writes the pack", async () => {
    const dir = tempDir();
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const result = await runPublish(
      {
        ...requestBase(dir),
        platform: "xiaohongshu",
        title: "加密货币要迎来大监管？",
      },
      {
        acceptRpaRisk: true,
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: async () => true,
        now: noon,
        packDir: path.join(dir, "pack"),
        rpaPacePath: path.join(dir, "rpa-pace.json"),
        rpaPublish: async (input) => {
          expect(input.request.platform).toBe("xiaohongshu");
          expect(input.request.video_path).toMatch(/final\.mp4$/);
          return {
            platform_post_id: null,
            message: "RPA submitted in the official xiaohongshu creator console.",
          };
        },
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("submitted");
    expect(result.pack_path).toMatch(/xiaohongshu\.json$/);
    const pack = JSON.parse(readFileSync(result.pack_path!, "utf8")) as {
      rpa: boolean;
    };
    expect(pack.rpa).toBe(true);
    const pace = JSON.parse(
      readFileSync(path.join(dir, "rpa-pace.json"), "utf8"),
    ) as { entries: Array<{ platform: string }> };
    expect(pace.entries).toHaveLength(1);
    expect(pace.entries[0]?.platform).toBe("xiaohongshu");
  });

  it("records RPA failure without dropping the pack", async () => {
    const dir = tempDir();
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    const result = await runPublish(
      {
        ...requestBase(dir),
        platform: "weixin-channels",
        title: "视频号标题至少六字",
      },
      {
        acceptRpaRisk: true,
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: async () => true,
        now: noon,
        packDir: path.join(dir, "pack"),
        rpaPacePath: path.join(dir, "rpa-pace.json"),
        rpaPublish: async () => {
          throw new Error("creator page changed");
        },
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("failed");
    expect(result.error_code).toBe("rpa");
    expect(result.pack_path).toMatch(/weixin-channels\.json$/);
  });

  it("blocks RPA overnight and keeps the pack", async () => {
    const dir = tempDir();
    const night = new Date();
    night.setHours(23, 30, 0, 0);
    let rpaCalls = 0;
    const result = await runPublish(
      {
        ...requestBase(dir),
        platform: "weixin-channels",
        title: "视频号标题至少六字",
      },
      {
        acceptRpaRisk: true,
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: async () => true,
        now: night,
        packDir: path.join(dir, "pack"),
        rpaPacePath: path.join(dir, "rpa-pace.json"),
        rpaPublish: async () => {
          rpaCalls += 1;
          return { platform_post_id: null, message: "should not run" };
        },
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(result.status).toBe("blocked");
    expect(result.error_code).toBe("rpa_night");
    expect(result.pack_path).toMatch(/weixin-channels\.json$/);
    expect(rpaCalls).toBe(0);
  });

  it("waits then posts the other platform for the same clip", async () => {
    const dir = tempDir();
    const videoPath = writeVideo(dir);
    const sha = createHash("sha256").update(readFileSync(videoPath)).digest("hex");
    let current = new Date();
    current.setHours(12, 0, 0, 0);
    const slept: number[] = [];
    const result = await runPublish(
      {
        ...requestBase(dir),
        video_path: videoPath,
        platform: "xiaohongshu",
        title: "加密货币要迎来大监管？",
      },
      {
        acceptRpaRisk: true,
        auditPath: path.join(dir, "audit.jsonl"),
        isEnabled: async () => true,
        now: () => current,
        packDir: path.join(dir, "pack"),
        rpaPaceEntries: [
          {
            at: current.toISOString(),
            platform: "weixin-channels",
            video_sha256: sha,
            account_alias: "default",
          },
        ],
        rpaPacePath: path.join(dir, "rpa-pace.json"),
        rpaPublish: async () => ({
          platform_post_id: null,
          message: "RPA confirmed publish in the official xiaohongshu creator console.",
        }),
        rpaSleep: async (ms) => {
          slept.push(ms);
          current = new Date(current.getTime() + ms);
        },
        scheduleDir: path.join(dir, "scheduled"),
      },
    );
    expect(slept[0]).toBeGreaterThan(0);
    expect(result.status).toBe("submitted");
    expect(result.platform).toBe("xiaohongshu");
  });

  it("adds publish to requires_approval only when the Job sets that gate pending", () => {
    const route = routeVideoJob(
      {
        job_id: "publish-gate-job",
        workflow: "auto",
        source: { type: "topic", subject: "发布门", refs: [] },
        output: { duration_seconds: 15, aspect_ratio: "9:16", language: "zh" },
        presenter: { mode: "none" },
        render: { engine: "auto" },
        review_gates: {
          script: "approved",
          storyboard: "approved",
          final_render: "approved",
          publish: "pending",
        },
      },
      { enabled: true },
    );
    expect(route.requires_approval).toEqual(["publish"]);
  });

  it("resolves --platform all to the three supported platforms", () => {
    expect(resolvePublishPlatforms("all")).toEqual([
      "douyin",
      "weixin-channels",
      "xiaohongshu",
    ]);
    expect(resolvePublishPlatforms("douyin")).toEqual(["douyin"]);
  });

  it("CLI refuses publish without --i-approve-publish", () => {
    const dir = tempDir();
    try {
      execFileSync(
        "npm",
        [
          "run",
          "video:publish",
          "--",
          "--platform",
          "douyin",
          "--video",
          writeVideo(dir),
          "--title",
          "测试标题",
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: process.env,
        },
      );
      throw new Error("expected video:publish to fail without approval");
    } catch (error) {
      const output = `${(error as { stdout?: string }).stdout ?? ""}${
        (error as { stderr?: string }).stderr ?? ""
      }`;
      expect(output).toMatch(/i-approve-publish/);
    }
  });

  it("CLI skips --i-approve-publish for dreamina and fans out --platform all", () => {
    const dir = tempDir();
    let output = "";
    try {
      output = execFileSync(
        "npm",
        [
          "run",
          "video:publish",
          "--",
          "--generation-service",
          "dreamina",
          "--platform",
          "all",
          "--video",
          writeVideo(dir),
          "--title",
          "即梦成片标题",
          "--audit",
          path.join(dir, "audit.jsonl"),
          "--schedule-dir",
          path.join(dir, "scheduled"),
          "--pack-dir",
          path.join(dir, "pack"),
        ],
        {
          cwd: process.cwd(),
          encoding: "utf8",
          env: {
            ...process.env,
            FLAG_video_publish: '{"enabled":false}',
          },
        },
      );
    } catch (error) {
      output = (error as { stdout?: string }).stdout ?? "";
    }
    const jsonStart = output.indexOf('{\n  "results"');
    const parsed = JSON.parse(output.slice(jsonStart)) as {
      results: Array<{ platform: string; status: string }>;
    };
    expect(parsed.results.map((result) => result.platform)).toEqual([
      "douyin",
      "weixin-channels",
      "xiaohongshu",
    ]);
    expect(parsed.results.every((result) => result.status === "blocked")).toBe(
      true,
    );
  });

  it("skips Douyin in --platform all when its flag is off", () => {
    expect(resolvePublishPlatforms("all")).toEqual([
      "douyin",
      "weixin-channels",
      "xiaohongshu",
    ]);
    expect(resolvePublishPlatforms("all", { skipDouyin: true })).toEqual([
      "weixin-channels",
      "xiaohongshu",
    ]);
  });
});
