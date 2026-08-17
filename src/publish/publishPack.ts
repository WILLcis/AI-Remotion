import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { PublishPlatform, PublishRequest } from "./schema";

const creatorUrls: Record<Exclude<PublishPlatform, "douyin">, string> = {
  "weixin-channels": "https://channels.weixin.qq.com/platform/post/create",
  xiaohongshu: "https://creator.xiaohongshu.com/publish/publish",
};

export const writePublishPack = (
  request: PublishRequest,
  outDir: string,
  options: { rpa?: boolean } = {},
): string => {
  if (request.platform === "douyin") {
    throw new Error("Douyin uses the official API adapter, not a publish pack.");
  }
  mkdirSync(outDir, { recursive: true });
  const packPath = path.join(outDir, `${request.platform}.json`);
  const rpa = Boolean(options.rpa);
  const pack = {
    platform: request.platform,
    mode: rpa ? "rpa-assisted" : "assisted-pack",
    rpa,
    creator_url: creatorUrls[request.platform],
    video_path: path.resolve(request.video_path),
    cover_path: request.cover_path
      ? path.resolve(request.cover_path)
      : null,
    title: request.title,
    caption: request.caption ?? "",
    topics: request.topics,
    visibility: request.visibility,
    account_alias: request.account_alias,
    schedule_at: request.schedule_at ?? null,
    checklist:
      request.platform === "weixin-channels"
        ? [
            "标题不少于 6 个字",
            "在视频号助手上传 MP4",
            "上传封面图（cover_path）",
            "声明原创（如适用）",
            "确认可见范围后由人工点击发表",
            ...(rpa
              ? ["RPA 已授权：将打开官方创作者页尝试上传；失败时仍用本清单手工发"]
              : []),
          ]
        : [
            "标题建议不超过约 20 字",
            "在小红书创作者后台上传视频",
            "上传封面图（cover_path）",
            "人工确认话题与正文后发布",
            "不要使用 cookie/私有 API",
            ...(rpa
              ? ["RPA 已授权：将打开官方创作者页尝试上传；失败时仍用本清单手工发"]
              : []),
          ],
  };
  writeFileSync(packPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8");
  return packPath;
};
