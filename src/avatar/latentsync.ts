import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type LatentSyncFetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  ok: boolean;
  status: number;
}>;

export type GenerateLatentSyncAvatarOptions = {
  audioPath: string;
  baseUrl: string;
  outputPath: string;
  request?: LatentSyncFetchLike;
  sourceVideoPath: string;
  timeoutMs?: number;
};

export const generateLatentSyncAvatar = async ({
  audioPath,
  baseUrl,
  outputPath,
  request = fetch,
  sourceVideoPath,
  timeoutMs = 900_000,
}: GenerateLatentSyncAvatarOptions): Promise<void> => {
  if (!existsSync(sourceVideoPath)) {
    throw new Error(`Missing LatentSync source video: ${sourceVideoPath}`);
  }
  if (!existsSync(audioPath)) {
    throw new Error(`Missing LatentSync scene audio: ${audioPath}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const form = new FormData();
  form.set(
    "source_video",
    new Blob([readFileSync(sourceVideoPath)], { type: "video/mp4" }),
    path.basename(sourceVideoPath),
  );
  form.set(
    "audio",
    new Blob([readFileSync(audioPath)], { type: "audio/wav" }),
    path.basename(audioPath),
  );

  try {
    const response = await request(toLatentSyncUrl(baseUrl), {
      body: form,
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`LatentSync request failed with status ${response.status}.`);
    }

    const outputBuffer = Buffer.from(await response.arrayBuffer());
    if (outputBuffer.length === 0) {
      throw new Error("LatentSync returned an empty avatar clip.");
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    writeFileSync(temporaryPath, outputBuffer);
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`LatentSync request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    rmSync(`${outputPath}.tmp`, { force: true });
  }
};

const toLatentSyncUrl = (baseUrl: string): string =>
  new URL("generate", `${baseUrl.replace(/\/+$/, "")}/`).toString();
