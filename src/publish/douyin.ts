import { readFileSync } from "node:fs";
import path from "node:path";

export type DouyinCredentials = {
  accessToken: string;
  openId: string;
};

export type DouyinCreateResult = {
  item_id?: string;
  video_id?: string;
};

export type DouyinClient = {
  createVideo: (input: {
    credentials: DouyinCredentials;
    text: string;
    videoId: string;
  }) => Promise<DouyinCreateResult>;
  uploadVideo: (input: {
    credentials: DouyinCredentials;
    filePath: string;
  }) => Promise<{ video_id: string }>;
};

export type DouyinFetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

const DOUYIN_BASE = "https://open.douyin.com";

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

export const loadDouyinCredentials = (
  env: NodeJS.ProcessEnv = process.env,
): DouyinCredentials => {
  const accessToken = env.AI_REMOTION_DOUYIN_ACCESS_TOKEN?.trim();
  const openId = env.AI_REMOTION_DOUYIN_OPEN_ID?.trim();
  if (!accessToken || !openId) {
    throw new Error(
      "Douyin publish requires AI_REMOTION_DOUYIN_ACCESS_TOKEN and AI_REMOTION_DOUYIN_OPEN_ID in the local env (never commit them).",
    );
  }
  return { accessToken, openId };
};

const readError = (payload: Record<string, unknown>): string => {
  const extra = asRecord(payload.extra);
  const data = asRecord(payload.data);
  const code =
    extra.error_code ??
    extra.sub_error_code ??
    data.error_code ??
    payload.error_code;
  const description =
    extra.description ??
    extra.sub_description ??
    data.description ??
    payload.message;
  return [code, description].filter(Boolean).join(": ") || "unknown Douyin error";
};

export const createHttpDouyinClient = (
  request: DouyinFetchLike = fetch,
): DouyinClient => ({
  async uploadVideo({ credentials, filePath }) {
    const bytes = readFileSync(filePath);
    const form = new FormData();
    form.append(
      "video",
      new Blob([new Uint8Array(bytes)]),
      path.basename(filePath) || "video.mp4",
    );
    const url = `${DOUYIN_BASE}/api/douyin/v1/video/upload_video/?open_id=${encodeURIComponent(credentials.openId)}`;
    const response = await request(url, {
      method: "POST",
      headers: { "access-token": credentials.accessToken },
      body: form,
    });
    const payload = asRecord(await response.json());
    const video = asRecord(asRecord(payload.data).video);
    const videoId = typeof video.video_id === "string" ? video.video_id : "";
    if (!response.ok || !videoId) {
      throw new Error(`Douyin upload failed: ${readError(payload)}`);
    }
    return { video_id: videoId };
  },

  async createVideo({ credentials, text, videoId }) {
    const url = `${DOUYIN_BASE}/api/douyin/v1/video/create_video/?open_id=${encodeURIComponent(credentials.openId)}`;
    const response = await request(url, {
      method: "POST",
      headers: {
        "access-token": credentials.accessToken,
        "content-type": "application/json",
      },
      body: JSON.stringify({ video_id: videoId, text }),
    });
    const payload = asRecord(await response.json());
    const data = asRecord(payload.data);
    if (!response.ok) {
      throw new Error(`Douyin create_video failed: ${readError(payload)}`);
    }
    return {
      item_id: typeof data.item_id === "string" ? data.item_id : undefined,
      video_id: videoId,
    };
  },
});

export const composeDouyinText = (title: string, topics: string[]): string => {
  const tags = topics
    .map((topic) => topic.replace(/^#/, "").trim())
    .filter(Boolean)
    .map((topic) => `#${topic}`);
  return [title.trim(), ...tags].join(" ").trim();
};
