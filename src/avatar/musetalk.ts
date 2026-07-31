import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type AvatarFetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  ok: boolean;
  status: number;
}>;

export type GenerateMuseTalkAvatarOptions = {
  audioPath: string;
  baseUrl: string;
  outputPath: string;
  photoPath: string;
  request?: AvatarFetchLike;
  timeoutMs?: number;
};

export const generateMuseTalkAvatar = async ({
  audioPath,
  baseUrl,
  outputPath,
  photoPath,
  request = fetch,
  timeoutMs = 300_000,
}: GenerateMuseTalkAvatarOptions): Promise<void> => {
  if (!existsSync(photoPath)) {
    throw new Error(`Missing avatar source photo: ${photoPath}`);
  }

  if (!existsSync(audioPath)) {
    throw new Error(`Missing avatar scene audio: ${audioPath}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const form = new FormData();
  form.set(
    "photo",
    new Blob([readFileSync(photoPath)], { type: "image/jpeg" }),
    path.basename(photoPath),
  );
  form.set(
    "audio",
    new Blob([readFileSync(audioPath)], { type: "audio/wav" }),
    path.basename(audioPath),
  );

  try {
    const response = await request(toMuseTalkUrl(baseUrl), {
      body: form,
      method: "POST",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`MuseTalk request failed with status ${response.status}.`);
    }

    const outputBuffer = Buffer.from(await response.arrayBuffer());
    if (outputBuffer.length === 0) {
      throw new Error("MuseTalk returned an empty avatar clip.");
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    writeFileSync(temporaryPath, outputBuffer);
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`MuseTalk request timed out after ${timeoutMs}ms.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
    rmSync(`${outputPath}.tmp`, { force: true });
  }
};

const toMuseTalkUrl = (baseUrl: string): string => {
  return new URL("generate", `${baseUrl.replace(/\/+$/, "")}/`).toString();
};
