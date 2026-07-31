import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

export type HyperFramesFetch = (input: string, init?: RequestInit) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  headers: Pick<Headers, "get">;
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type RenderHyperFramesOptions = {
  apiKey: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  bundlePath: string;
  fps?: number;
  outputPath: string;
  request?: HyperFramesFetch;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  title: string;
};

export const renderHyperFrames = async ({
  apiKey,
  aspectRatio = "1:1",
  bundlePath,
  fps = 60,
  outputPath,
  request = fetch,
  sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  timeoutMs = 900_000,
  title,
}: RenderHyperFramesOptions): Promise<string> => {
  if (!apiKey) throw new Error("HEYGEN_API_KEY is required for HyperFrames.");
  if (!existsSync(bundlePath)) throw new Error(`Missing HyperFrames bundle: ${bundlePath}`);
  const bundle = readFileSync(bundlePath);
  const upload = await jsonRequest({
    apiKey,
    body: JSON.stringify({
      content_type: "application/zip",
      filename: path.basename(bundlePath),
      size_bytes: bundle.length,
    }),
    method: "POST",
    pathName: "v3/assets/direct-uploads",
    request,
    sleep,
  });
  const assetId = stringField(upload, "asset_id");
  const uploadUrl = stringField(upload, "upload_url");
  const headers = objectField(upload, "upload_headers");
  if (!assetId || !uploadUrl) throw new Error("HyperFrames direct upload returned no asset id or upload URL.");
  const put = await request(uploadUrl, {
    body: bundle,
    headers: Object.fromEntries(
      Object.entries(headers).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ),
    method: "PUT",
  });
  if (!put.ok) throw new Error(`HyperFrames bundle upload failed with status ${put.status}.`);
  await jsonRequest({
    apiKey,
    body: "{}",
    method: "POST",
    pathName: `v3/assets/${encodeURIComponent(assetId)}/complete`,
    request,
    sleep,
  });
  const created = await jsonRequest({
    apiKey,
    body: JSON.stringify({
      aspect_ratio: aspectRatio,
      composition: "index.html",
      format: "mp4",
      fps,
      project: { asset_id: assetId, type: "asset_id" },
      quality: "high",
      resolution: "1080p",
      title,
    }),
    method: "POST",
    pathName: "v3/hyperframes/renders",
    request,
    sleep,
  });
  const renderId = stringField(created, "render_id");
  if (!renderId) throw new Error("HyperFrames render creation returned no render id.");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await jsonRequest({
      apiKey,
      method: "GET",
      pathName: `v3/hyperframes/renders/${encodeURIComponent(renderId)}`,
      request,
      sleep,
    });
    if (status.status === "completed") {
      const videoUrl = stringField(status, "video_url");
      if (!videoUrl) throw new Error(`HyperFrames render ${renderId} completed without a video URL.`);
      const video = await request(videoUrl, { method: "GET" });
      if (!video.ok) throw new Error(`HyperFrames video download failed with status ${video.status}.`);
      mkdirSync(path.dirname(outputPath), { recursive: true });
      const temporaryPath = `${outputPath}.tmp`;
      try {
        writeFileSync(temporaryPath, Buffer.from(await video.arrayBuffer()));
        if (readFileSync(temporaryPath).length === 0) throw new Error("HyperFrames returned an empty video.");
        renameSync(temporaryPath, outputPath);
      } finally {
        rmSync(temporaryPath, { force: true });
      }
      return renderId;
    }
    if (status.status === "failed") {
      throw new Error(`HyperFrames render ${renderId} failed: ${stringField(status, "failure_message") ?? "unknown error"}`);
    }
    await sleep(10_000);
  }
  throw new Error(`HyperFrames render ${renderId} timed out after ${timeoutMs}ms.`);
};

const jsonRequest = async ({
  apiKey, body, method, pathName, request, sleep,
}: {
  apiKey: string; body?: string; method: "GET" | "POST"; pathName: string;
  request: HyperFramesFetch; sleep: (milliseconds: number) => Promise<void>;
}): Promise<Record<string, unknown>> => {
  const response = await retry({
    input: new URL(pathName, "https://api.heygen.com/").toString(),
    init: {
      body,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(method === "POST" ? { "Idempotency-Key": randomUUID() } : {}),
        "X-Api-Key": apiKey,
      },
      method,
    },
    request,
    sleep,
  });
  const responsePayload = await response.json();
  const payload = objectField(responsePayload, "data");
  if (!response.ok) {
    const error = objectField(responsePayload, "error");
    throw new Error(`HyperFrames ${method} ${pathName} failed with status ${response.status}: ${stringField(error, "message") ?? stringField(responsePayload as Record<string, unknown>, "message") ?? "unknown error"}`);
  }
  return payload;
};

const retry = async ({ input, init, request, sleep }: {
  input: string; init: RequestInit; request: HyperFramesFetch; sleep: (milliseconds: number) => Promise<void>;
}) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await request(input, init);
      if (response.status !== 429 || attempt === 3) return response;
      await sleep(Number(response.headers.get("Retry-After")) * 1_000 || 1_000);
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 1_000);
    }
  }
  throw new Error(`HyperFrames request failed after 3 attempts: ${String(lastError)}`);
};

const objectField = (value: unknown, key: string): Record<string, unknown> => {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
  const nested = record[key];
  return nested && typeof nested === "object" && !Array.isArray(nested)
    ? (nested as Record<string, unknown>)
    : record;
};

const stringField = (record: Record<string, unknown>, key: string): string | undefined =>
  typeof record[key] === "string" && record[key].trim() ? record[key] as string : undefined;
