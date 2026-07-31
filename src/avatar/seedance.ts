import { createHash, createHmac } from "node:crypto";
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

export type SeedanceFetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type SeedanceAssetKind = "audio" | "image";

export type UploadSeedanceAsset = (input: {
  filePath: string;
  kind: SeedanceAssetKind;
}) => Promise<string>;

export type SeedanceTosConfig = {
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  endpoint: string;
  prefix: string;
  region: string;
  request?: (
    input: URL,
    init: RequestInit,
  ) => Promise<{
    headers?: Pick<Headers, "get">;
    ok: boolean;
    status: number;
    text?: () => Promise<string>;
  }>;
  sessionToken?: string;
};

export type GenerateSeedanceAvatarOptions = {
  arkApiKey: string;
  arkBaseUrl: string;
  arkModel: string;
  audioPath: string;
  durationSeconds: number;
  episodeId: string;
  manifestPath?: string;
  outputPath: string;
  photoPath?: string;
  pollIntervalMs?: number;
  prompt: string;
  referenceImageUrl?: string;
  request?: SeedanceFetchLike;
  sceneId: string;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  uploadAsset: UploadSeedanceAsset;
};

export type GenerateSeedanceAvatarResult = {
  durationSeconds: number;
  outputPath: string;
  promptHash: string;
  provider: "seedance";
  taskId: string;
};

export type RecoverSeedanceAvatarOptions = {
  arkApiKey: string;
  arkBaseUrl: string;
  arkModel: string;
  audioPath: string;
  durationSeconds: number;
  episodeId: string;
  manifestPath?: string;
  outputPath: string;
  pollIntervalMs?: number;
  prompt: string;
  request?: SeedanceFetchLike;
  sceneId: string;
  sleep?: (milliseconds: number) => Promise<void>;
  taskId: string;
  timeoutMs?: number;
};

export const getSeedanceVideoNormalizationCommand = ({
  durationSeconds,
  fps,
  inputPath,
  outputPath,
}: {
  durationSeconds: number;
  fps: number;
  inputPath: string;
  outputPath: string;
}): string[] => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error("Seedance normalization requires a positive duration.");
  }
  if (!Number.isInteger(fps) || fps <= 0) {
    throw new Error("Seedance normalization requires a positive integer fps.");
  }
  return [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-an",
    "-vf",
    `fps=${fps}`,
    "-t",
    durationSeconds.toFixed(3),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    outputPath,
  ];
};

export const createTosSeedanceUploader = ({
  accessKeyId,
  accessKeySecret,
  bucket,
  endpoint,
  prefix,
  request = fetch,
  region,
  sessionToken,
}: SeedanceTosConfig): UploadSeedanceAsset => {
  return async ({ filePath, kind }) => {
    if (!existsSync(filePath)) {
      throw new Error(`Missing Seedance ${kind} asset: ${filePath}`);
    }

    const extension = path.extname(filePath).toLowerCase() || defaultExtension(kind);
    const contentType = contentTypeFor(kind, extension);
    if (statSync(filePath).isDirectory()) {
      throw new Error(`Seedance ${kind} asset must be a file: ${filePath}`);
    }
    const body = readFileSync(filePath);
    if (body.length > MAX_TOS_ASSET_BYTES) {
      throw new Error(`Seedance ${kind} asset exceeds the 32 MiB upload limit.`);
    }

    const assetHash = hashBuffer(body);
    const key = `${trimSlashes(prefix)}/${kind}/${assetHash}${extension}`;
    const objectUrl = tosObjectUrl({ bucket, endpoint, key });
    const now = new Date();
    const headers = signTosRequest({
      accessKeyId,
      accessKeySecret,
      contentType,
      method: "PUT",
      now,
      region,
      sessionToken,
      url: objectUrl,
    });
    const uploadResponse = await retryRequest({
      action: "TOS upload",
      init: {
        body,
        headers,
        method: "PUT",
      },
      input: objectUrl,
      request,
    });
    if (!uploadResponse.ok) {
      const errorDetail = await readTosError(uploadResponse);
      throw new Error(
        `TOS upload failed with status ${uploadResponse.status} for ${kind} asset${errorDetail ? `: ${errorDetail}` : ""}.`,
      );
    }
    return createTosPresignedGetUrl({
      accessKeyId,
      accessKeySecret,
      now,
      region,
      sessionToken,
      url: objectUrl,
    });
  };
};

const readTosError = async (
  response: {
    headers?: Pick<Headers, "get">;
    text?: () => Promise<string>;
  },
): Promise<string | undefined> => {
  const body = response.text ? await response.text() : "";
  const code = body.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const message = body.match(/<Message>([^<]+)<\/Message>/)?.[1];
  const requestId = response.headers?.get("x-tos-request-id");
  return [code, message, requestId ? `request ID ${requestId}` : undefined]
    .filter(Boolean)
    .join(": ") || undefined;
};

export const generateSeedanceAvatar = async ({
  arkApiKey,
  arkBaseUrl,
  arkModel,
  audioPath,
  durationSeconds,
  episodeId,
  manifestPath,
  outputPath,
  photoPath,
  pollIntervalMs = 5_000,
  prompt,
  referenceImageUrl,
  request = fetch,
  sceneId,
  sleep = (milliseconds) =>
    new Promise((resolve) => {
      setTimeout(resolve, milliseconds);
    }),
  timeoutMs = 900_000,
  uploadAsset,
}: GenerateSeedanceAvatarOptions): Promise<GenerateSeedanceAvatarResult> => {
  if (!photoPath && !referenceImageUrl) {
    throw new Error("Seedance requires a presenter photo or an Ark asset reference.");
  }
  if (photoPath && !existsSync(photoPath)) {
    throw new Error(`Missing Seedance presenter photo: ${photoPath}`);
  }
  if (!existsSync(audioPath)) {
    throw new Error(`Missing Seedance scene audio: ${audioPath}`);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 15) {
    throw new Error("Seedance scene duration must be greater than 0 and no more than 15 seconds.");
  }

  const imageUrl = referenceImageUrl ?? (await uploadAsset({
    filePath: photoPath!,
    kind: "image",
  }));
  const audioUrl = await uploadAsset({ filePath: audioPath, kind: "audio" });
  const createResponse = await request(toArkTasksUrl(arkBaseUrl), {
    body: JSON.stringify({
      content: [
        { text: prompt, type: "text" },
        {
          image_url: { url: imageUrl },
          role: "reference_image",
          type: "image_url",
        },
        {
          audio_url: { url: audioUrl },
          role: "reference_audio",
          type: "audio_url",
        },
      ],
      duration: Math.ceil(durationSeconds),
      generate_audio: false,
      model: arkModel,
      ratio: "9:16",
      resolution: "720p",
      watermark: false,
    }),
    headers: arkHeaders(arkApiKey),
    method: "POST",
  });
  const createdTask = await parseArkResponse(createResponse, "Seedance task creation");
  const taskId = readTaskId(createdTask);
  if (!taskId) {
    throw new Error("Seedance task creation returned no task id.");
  }

  const completedTask = await pollForTask({
    arkApiKey,
    arkBaseUrl,
    request,
    sleep,
    taskId,
    timeoutMs,
    pollIntervalMs,
  });
  const videoUrl = readVideoUrl(completedTask);
  if (!videoUrl) {
    throw new Error(`Seedance task ${taskId} succeeded without a video URL.`);
  }

  const videoResponse = await retryRequest({
    action: "Seedance video download",
    init: { method: "GET" },
    input: videoUrl,
    request,
    sleep,
  });
  if (!videoResponse.ok) {
    throw new Error(`Seedance video download failed with status ${videoResponse.status}.`);
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.tmp`;
  try {
    writeFileSync(temporaryOutputPath, Buffer.from(await videoResponse.arrayBuffer()));
    if (readFileSync(temporaryOutputPath).length === 0) {
      throw new Error("Seedance returned an empty video.");
    }
    renameSync(temporaryOutputPath, outputPath);
  } finally {
    rmSync(temporaryOutputPath, { force: true });
  }

  const promptHash = hashText(prompt);
  if (manifestPath) {
    writeSeedanceManifest({
      episodeId,
      manifestPath,
      record: {
        audio_hash: hashBuffer(readFileSync(audioPath)),
        duration_seconds: durationSeconds,
        generated_at: new Date().toISOString(),
        model: arkModel,
        output_path: outputPath,
        prompt_hash: promptHash,
        scene_id: sceneId,
        task_id: taskId,
      },
    });
  }

  return {
    durationSeconds,
    outputPath,
    promptHash,
    provider: "seedance",
    taskId,
  };
};

export const recoverSeedanceAvatar = async ({
  arkApiKey,
  arkBaseUrl,
  arkModel,
  audioPath,
  durationSeconds,
  episodeId,
  manifestPath,
  outputPath,
  pollIntervalMs = 5_000,
  prompt,
  request = fetch,
  sceneId,
  sleep = defaultSleep,
  taskId,
  timeoutMs = 900_000,
}: RecoverSeedanceAvatarOptions): Promise<GenerateSeedanceAvatarResult> => {
  const completedTask = await pollForTask({
    arkApiKey,
    arkBaseUrl,
    request,
    sleep,
    taskId,
    timeoutMs,
    pollIntervalMs,
  });
  const videoUrl = readVideoUrl(completedTask);
  if (!videoUrl) {
    throw new Error(`Seedance task ${taskId} succeeded without a video URL.`);
  }

  const videoResponse = await retryRequest({
    action: "Seedance video download",
    init: { method: "GET" },
    input: videoUrl,
    request,
    sleep,
  });
  if (!videoResponse.ok) {
    throw new Error(`Seedance video download failed with status ${videoResponse.status}.`);
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryOutputPath = `${outputPath}.tmp`;
  try {
    writeFileSync(temporaryOutputPath, Buffer.from(await videoResponse.arrayBuffer()));
    if (readFileSync(temporaryOutputPath).length === 0) {
      throw new Error("Seedance returned an empty video.");
    }
    renameSync(temporaryOutputPath, outputPath);
  } finally {
    rmSync(temporaryOutputPath, { force: true });
  }

  const promptHash = hashText(prompt);
  if (manifestPath) {
    writeSeedanceManifest({
      episodeId,
      manifestPath,
      record: {
        audio_hash: hashBuffer(readFileSync(audioPath)),
        duration_seconds: durationSeconds,
        generated_at: new Date().toISOString(),
        model: arkModel,
        output_path: outputPath,
        prompt_hash: promptHash,
        scene_id: sceneId,
        task_id: taskId,
      },
    });
  }

  return {
    durationSeconds,
    outputPath,
    promptHash,
    provider: "seedance",
    taskId,
  };
};

const pollForTask = async ({
  arkApiKey,
  arkBaseUrl,
  pollIntervalMs,
  request,
  sleep,
  taskId,
  timeoutMs,
}: {
  arkApiKey: string;
  arkBaseUrl: string;
  pollIntervalMs: number;
  request: SeedanceFetchLike;
  sleep: (milliseconds: number) => Promise<void>;
  taskId: string;
  timeoutMs: number;
}): Promise<Record<string, unknown>> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const response = await retryRequest({
      action: `Seedance task ${taskId} polling`,
      init: {
        headers: arkHeaders(arkApiKey),
        method: "GET",
      },
      input: `${toArkTasksUrl(arkBaseUrl)}/${encodeURIComponent(taskId)}`,
      request,
      sleep,
    });
    const task = await parseArkResponse(response, `Seedance task ${taskId}`);
    const status = readStatus(task);
    if (status === "succeeded") {
      return task;
    }
    if (status === "failed" || status === "expired") {
      throw new Error(`Seedance task ${taskId} ${status}: ${readErrorMessage(task)}`);
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`Seedance task ${taskId} timed out after ${timeoutMs}ms.`);
};

const retryRequest = async <T, TInput extends URL | string>({
  action,
  init,
  input,
  request,
  sleep = defaultSleep,
}: {
  action: string;
  init: RequestInit;
  input: TInput;
  request: (input: TInput, init: RequestInit) => Promise<T>;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await request(input, init);
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

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const parseArkResponse = async (
  response: Awaited<ReturnType<SeedanceFetchLike>>,
  action: string,
): Promise<Record<string, unknown>> => {
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`${action} failed with status ${response.status}: ${readErrorMessage(payload)}`);
  }
  const record = toRecord(payload);
  const data = toRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
};

const toArkTasksUrl = (baseUrl: string): string =>
  new URL("contents/generations/tasks", `${baseUrl.replace(/\/+$/, "")}/`).toString();

const arkHeaders = (apiKey: string): Record<string, string> => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

const readTaskId = (payload: Record<string, unknown>): string | undefined =>
  readString(payload.id) ?? readString(toRecord(payload.task)?.id);

const readStatus = (payload: Record<string, unknown>): string | undefined =>
  readString(payload.status);

const readVideoUrl = (payload: Record<string, unknown>): string | undefined =>
  readString(toRecord(payload.content)?.video_url) ??
  readString(toRecord(toRecord(payload.output)?.content)?.video_url);

const readErrorMessage = (payload: unknown): string => {
  const record = toRecord(payload);
  const error = toRecord(record.error);
  return (
    readString(error.message) ??
    readString(record.message) ??
    readString(record.code) ??
    "unknown error"
  );
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() !== "" ? value : undefined;

const writeSeedanceManifest = ({
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
    `${JSON.stringify(
      {
        clips,
        episode_id: episodeId,
        provider: "seedance",
        version: 1,
      },
      null,
      2,
    )}\n`,
  );
};

const hashText = (value: string): string =>
  createHash("sha256").update(value).digest("hex");

const hashBuffer = (value: Buffer): string =>
  createHash("sha256").update(value).digest("hex");

const trimSlashes = (value: string): string => value.replace(/^\/+|\/+$/g, "");

const defaultExtension = (kind: SeedanceAssetKind): string =>
  kind === "image" ? ".png" : ".wav";

const contentTypeFor = (kind: SeedanceAssetKind, extension: string): string => {
  if (kind === "audio") {
    return extension === ".mp3" ? "audio/mpeg" : "audio/wav";
  }
  return extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
};

const MAX_TOS_ASSET_BYTES = 32 * 1024 * 1024;

const tosObjectUrl = ({
  bucket,
  endpoint,
  key,
}: {
  bucket: string;
  endpoint: string;
  key: string;
}): URL => {
  const endpointUrl = new URL(
    endpoint.startsWith("http://") || endpoint.startsWith("https://")
      ? endpoint
      : `https://${endpoint}`,
  );
  const host = endpointUrl.hostname.startsWith(`${bucket}.`)
    ? endpointUrl.hostname
    : `${bucket}.${endpointUrl.hostname}`;
  return new URL(
    `${endpointUrl.protocol}//${host}${endpointUrl.port ? `:${endpointUrl.port}` : ""}/${encodeTosPath(key)}`,
  );
};

const signTosRequest = ({
  accessKeyId,
  accessKeySecret,
  contentType,
  method,
  now,
  region,
  sessionToken,
  url,
}: {
  accessKeyId: string;
  accessKeySecret: string;
  contentType: string;
  method: "PUT";
  now: Date;
  region: string;
  sessionToken?: string;
  url: URL;
}): Record<string, string> => {
  const timestamp = tosTimestamp(now);
  const date = timestamp.slice(0, 8);
  const headers: Record<string, string> = {
    host: url.host,
    "x-tos-content-sha256": "UNSIGNED-PAYLOAD",
    "x-tos-date": timestamp,
  };
  if (sessionToken) {
    headers["x-tos-security-token"] = sessionToken;
  }
  const { canonicalHeaders, signedHeaders } = canonicalizeHeaders(headers);
  const scope = `${date}/${region}/tos/request`;
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const signature = tosSignature({
    accessKeySecret,
    canonicalRequest,
    scope,
    timestamp,
  });
  return {
    ...headers,
    Authorization: `TOS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "content-type": contentType,
  };
};

const createTosPresignedGetUrl = ({
  accessKeyId,
  accessKeySecret,
  now,
  region,
  sessionToken,
  url,
}: {
  accessKeyId: string;
  accessKeySecret: string;
  now: Date;
  region: string;
  sessionToken?: string;
  url: URL;
}): string => {
  const timestamp = tosTimestamp(now);
  const date = timestamp.slice(0, 8);
  const scope = `${date}/${region}/tos/request`;
  const query: Record<string, string> = {
    "X-Tos-Algorithm": "TOS4-HMAC-SHA256",
    "X-Tos-Credential": `${accessKeyId}/${scope}`,
    "X-Tos-Content-Sha256": "UNSIGNED-PAYLOAD",
    "X-Tos-Date": timestamp,
    "X-Tos-Expires": "3600",
    "X-Tos-SignedHeaders": "host",
  };
  if (sessionToken) {
    query["X-Tos-Security-Token"] = sessionToken;
  }
  const canonicalQuery = canonicalizeQuery(query);
  const canonicalRequest = [
    "GET",
    url.pathname,
    canonicalQuery,
    `host:${url.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const signature = tosSignature({
    accessKeySecret,
    canonicalRequest,
    scope,
    timestamp,
  });
  return `${url.toString()}?${canonicalQuery}&X-Tos-Signature=${signature}`;
};

const tosSignature = ({
  accessKeySecret,
  canonicalRequest,
  scope,
  timestamp,
}: {
  accessKeySecret: string;
  canonicalRequest: string;
  scope: string;
  timestamp: string;
}): string => {
  const stringToSign = [
    "TOS4-HMAC-SHA256",
    timestamp,
    scope,
    hashText(canonicalRequest),
  ].join("\n");
  const date = timestamp.slice(0, 8);
  const region = scope.split("/")[1];
  const dateKey = hmac(accessKeySecret, date);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "tos");
  const signingKey = hmac(serviceKey, "request");
  return createHmac("sha256", signingKey).update(stringToSign).digest("hex");
};

const hmac = (key: Buffer | string, value: string): Buffer =>
  createHmac("sha256", key).update(value).digest();

const canonicalizeHeaders = (
  headers: Record<string, string>,
): { canonicalHeaders: string; signedHeaders: string } => {
  const entries = Object.entries(headers)
    .map(([key, value]) => [key.toLowerCase(), value.trim().replace(/\s+/g, " ")] as const)
    .sort(([left], [right]) => left.localeCompare(right));
  return {
    canonicalHeaders: `${entries.map(([key, value]) => `${key}:${value}`).join("\n")}\n`,
    signedHeaders: entries.map(([key]) => key).join(";"),
  };
};

const canonicalizeQuery = (query: Record<string, string>): string =>
  Object.entries(query)
    .map(([key, value]) => [encodeTosComponent(key), encodeTosComponent(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

const encodeTosPath = (value: string): string =>
  value.split("/").map(encodeTosComponent).join("/");

const encodeTosComponent = (value: string): string =>
  encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const tosTimestamp = (date: Date): string =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
