import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type InfiniteTalkFetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  ok: boolean;
  status: number;
}>;

export type GenerateInfiniteTalkAvatarOptions = {
  audioPath: string;
  baseUrl: string;
  outputPath: string;
  photoPath: string;
  request?: InfiniteTalkFetchLike;
  timeoutMs?: number;
};

export const generateInfiniteTalkAvatar = async ({
  audioPath,
  baseUrl,
  outputPath,
  photoPath,
  request = fetch,
  timeoutMs = 1_800_000,
}: GenerateInfiniteTalkAvatarOptions): Promise<void> => {
  if (!existsSync(photoPath)) {
    throw new Error(`Missing InfiniteTalk portrait: ${photoPath}`);
  }
  if (!existsSync(audioPath)) {
    throw new Error(`Missing InfiniteTalk scene audio: ${audioPath}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const form = new FormData();
  form.set(
    "photo",
    new Blob([readFileSync(photoPath)], { type: "image/png" }),
    path.basename(photoPath),
  );
  form.set(
    "audio",
    new Blob([readFileSync(audioPath)], { type: "audio/wav" }),
    path.basename(audioPath),
  );

  try {
    const response = await request(toInfiniteTalkUrl(baseUrl), {
      body: form,
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`InfiniteTalk request failed with status ${response.status}.`);
    }

    const outputBuffer = Buffer.from(await response.arrayBuffer());
    if (outputBuffer.length === 0) {
      throw new Error("InfiniteTalk returned an empty avatar clip.");
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    writeFileSync(temporaryPath, outputBuffer);
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`InfiniteTalk request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    rmSync(`${outputPath}.tmp`, { force: true });
  }
};

const toInfiniteTalkUrl = (baseUrl: string): string =>
  new URL("generate", `${baseUrl.replace(/\/+$/, "")}/`).toString();
