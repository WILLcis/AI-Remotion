import { createHash, randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type HeyGenFetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  headers: Pick<Headers, "get">;
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type GenerateHeyGenAvatarOptions = {
  apiKey: string;
  audioPath: string;
  baseUrl?: string;
  durationSeconds: number;
  episodeId: string;
  manifestPath?: string;
  outputPath: string;
  photoPath: string;
  pollIntervalMs?: number;
  request?: HeyGenFetchLike;
  sceneId: string;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
};

export type GenerateHeyGenAvatarResult = {
  durationSeconds: number;
  outputPath: string;
  provider: "heygen";
  videoId: string;
};

const MAX_ASSET_BYTES = 32 * 1024 * 1024;

export const generateHeyGenAvatar = async ({
  apiKey,
  audioPath,
  baseUrl = "https://api.heygen.com",
  durationSeconds,
  episodeId,
  manifestPath,
  outputPath,
  photoPath,
  pollIntervalMs = 5_000,
  request = fetch,
  sceneId,
  sleep = defaultSleep,
  timeoutMs = 900_000,
}: GenerateHeyGenAvatarOptions): Promise<GenerateHeyGenAvatarResult> => {
  if (!apiKey.trim()) {
    throw new Error("HEYGEN_API_KEY is required for HeyGen.");
  }
  if (!existsSync(photoPath)) {
    throw new Error(`Missing HeyGen presenter photo: ${photoPath}`);
  }
  if (!existsSync(audioPath)) {
    throw new Error(`Missing HeyGen scene audio: ${audioPath}`);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("HeyGen scene duration must be positive.");
  }

  const photoAssetId = await uploadAsset({
    apiKey,
    baseUrl,
    filePath: photoPath,
    kind: "image",
    request,
    sleep,
  });
  const audioAssetId = await uploadAsset({
    apiKey,
    baseUrl,
    filePath: audioPath,
    kind: "audio",
    request,
    sleep,
  });
  const created = await requestJson({
    action: "HeyGen video creation",
    apiKey,
    baseUrl,
    body: JSON.stringify({
      aspect_ratio: "auto",
      audio_asset_id: audioAssetId,
      callback_id: `${episodeId}:${sceneId}`,
      fit: "contain",
      image: { asset_id: photoAssetId, type: "asset_id" },
      resolution: "1080p",
      title: `${episodeId} ${sceneId}`,
      type: "image",
    }),
    idempotencyKey: randomUUID(),
    pathName: "v3/videos",
    request,
    sleep,
    method: "POST",
  });
  const videoId = readString(created.video_id) ?? readString(created.id);
  if (!videoId) {
    throw new Error("HeyGen video creation returned no video id.");
  }

  const completed = await pollForVideo({
    apiKey,
    baseUrl,
    pollIntervalMs,
    request,
    sleep,
    timeoutMs,
    videoId,
  });
  const videoUrl = readString(completed.video_url);
  if (!videoUrl) {
    throw new Error(`HeyGen video ${videoId} completed without a video URL.`);
  }
  const videoResponse = await requestWithRetry({
    action: "HeyGen video download",
    init: { method: "GET" },
    input: videoUrl,
    request,
    sleep,
  });
  if (!videoResponse.ok) {
    throw new Error(`HeyGen video download failed with status ${videoResponse.status}.`);
  }

  writeOutputAtomically(outputPath, Buffer.from(await videoResponse.arrayBuffer()));
  if (manifestPath) {
    writeHeyGenManifest({
      episodeId,
      manifestPath,
      record: {
        audio_asset_id: audioAssetId,
        audio_hash: hashFile(audioPath),
        duration_seconds: durationSeconds,
        generated_at: new Date().toISOString(),
        image_asset_id: photoAssetId,
        output_path: outputPath,
        scene_id: sceneId,
        video_id: videoId,
      },
    });
  }

  return { durationSeconds, outputPath, provider: "heygen", videoId };
};

export const verifyHeyGenAccount = async ({
  apiKey,
  baseUrl = "https://api.heygen.com",
  request = fetch,
}: {
  apiKey: string;
  baseUrl?: string;
  request?: HeyGenFetchLike;
}): Promise<void> => {
  await requestJson({
    action: "HeyGen account verification",
    apiKey,
    baseUrl,
    pathName: "v3/users/me",
    request,
    method: "GET",
  });
};

const uploadAsset = async ({
  apiKey,
  baseUrl,
  filePath,
  kind,
  request,
  sleep,
}: {
  apiKey: string;
  baseUrl: string;
  filePath: string;
  kind: "audio" | "image";
  request: HeyGenFetchLike;
  sleep: (milliseconds: number) => Promise<void>;
}): Promise<string> => {
  if (statSync(filePath).isDirectory()) {
    throw new Error(`HeyGen ${kind} asset must be a file: ${filePath}`);
  }
  const body = readFileSync(filePath);
  if (body.length > MAX_ASSET_BYTES) {
    throw new Error(`HeyGen ${kind} asset exceeds the 32 MiB upload limit.`);
  }
  const form = new FormData();
  form.set(
    "file",
    new Blob([body], { type: contentTypeFor(filePath, kind) }),
    path.basename(filePath),
  );
  const payload = await requestJson({
    action: `HeyGen ${kind} asset upload`,
    apiKey,
    baseUrl,
    body: form,
    idempotencyKey: randomUUID(),
    pathName: "v3/assets",
    request,
    sleep,
    method: "POST",
  });
  const assetId = readString(payload.asset_id) ?? readString(payload.id);
  if (!assetId) {
    throw new Error(`HeyGen ${kind} asset upload returned no asset id.`);
  }
  return assetId;
};

const pollForVideo = async ({
  apiKey,
  baseUrl,
  pollIntervalMs,
  request,
  sleep,
  timeoutMs,
  videoId,
}: {
  apiKey: string;
  baseUrl: string;
  pollIntervalMs: number;
  request: HeyGenFetchLike;
  sleep: (milliseconds: number) => Promise<void>;
  timeoutMs: number;
  videoId: string;
}): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const video = await requestJson({
      action: `HeyGen video ${videoId} polling`,
      apiKey,
      baseUrl,
      pathName: `v3/videos/${encodeURIComponent(videoId)}`,
      request,
      sleep,
      method: "GET",
    });
    const status = readString(video.status);
    if (status === "completed") {
      return video;
    }
    if (status === "failed") {
      throw new Error(
        `HeyGen video ${videoId} failed: ${
          readString(video.failure_message) ??
          readString(video.message) ??
          readString(video.failure_code) ??
          "unknown error"
        }`,
      );
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`HeyGen video ${videoId} timed out after ${timeoutMs}ms.`);
};

const requestJson = async ({
  action,
  apiKey,
  baseUrl,
  body,
  idempotencyKey,
  method,
  pathName,
  request,
  sleep,
}: {
  action: string;
  apiKey: string;
  baseUrl: string;
  body?: BodyInit;
  idempotencyKey?: string;
  method: "GET" | "POST";
  pathName: string;
  request: HeyGenFetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<Record<string, unknown>> => {
  const headers: Record<string, string> = { "X-Api-Key": apiKey };
  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
  }
  if (typeof body === "string") {
    headers["Content-Type"] = "application/json";
  }
  const response = await requestWithRetry({
    action,
    init: { body, headers, method },
    input: toHeyGenUrl(baseUrl, pathName),
    request,
    sleep,
  });
  const payload = await response.json();
  const record = toRecord(payload);
  if (!response.ok) {
    const error = toRecord(record.error);
    const detail =
      readString(error.message) ??
      readString(record.message) ??
      readString(error.code) ??
      "unknown error";
    throw new Error(`${action} failed with status ${response.status}: ${detail}`);
  }
  const data = toRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
};

const requestWithRetry = async ({
  action,
  init,
  input,
  request,
  sleep = defaultSleep,
}: {
  action: string;
  init: RequestInit;
  input: string;
  request: HeyGenFetchLike;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<Awaited<ReturnType<HeyGenFetchLike>>> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request(input, init);
      if (response.status !== 429 || attempt === 3) {
        return response;
      }
      const retryAfterSeconds = Number(response.headers.get("Retry-After"));
      await sleep(
        Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
          ? retryAfterSeconds * 1_000
          : attempt * 1_000,
      );
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await sleep(attempt * 1_000);
      }
    }
  }
  const detail = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${action} failed after 3 network attempts: ${detail}`);
};

const writeOutputAtomically = (outputPath: string, output: Buffer): void => {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  try {
    writeFileSync(temporaryPath, output);
    if (output.length === 0) {
      throw new Error("HeyGen returned an empty video.");
    }
    renameSync(temporaryPath, outputPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
};

const writeHeyGenManifest = ({
  episodeId,
  manifestPath,
  record,
}: {
  episodeId: string;
  manifestPath: string;
  record: Record<string, string | number>;
}): void => {
  const previous = existsSync(manifestPath)
    ? (JSON.parse(readFileSync(manifestPath, "utf8")) as {
        clips?: Array<Record<string, string | number>>;
      })
    : {};
  const clips = (previous.clips ?? []).filter((clip) => clip.scene_id !== record.scene_id);
  clips.push(record);
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(
    manifestPath,
    `${JSON.stringify({ clips, episode_id: episodeId, provider: "heygen", version: 1 }, null, 2)}\n`,
  );
};

const toHeyGenUrl = (baseUrl: string, pathName: string): string =>
  new URL(pathName, `${baseUrl.replace(/\/+$/, "")}/`).toString();

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value : undefined;

const hashFile = (filePath: string): string =>
  createHash("sha256").update(readFileSync(filePath)).digest("hex");

const contentTypeFor = (filePath: string, kind: "audio" | "image"): string => {
  const extension = path.extname(filePath).toLowerCase();
  if (kind === "audio") {
    return extension === ".mp3" ? "audio/mpeg" : "audio/wav";
  }
  return extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
};

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
