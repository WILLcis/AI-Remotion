import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

export type LongCatFetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{
  arrayBuffer: () => Promise<ArrayBuffer>;
  ok: boolean;
  status: number;
}>;

export type GenerateLongCatAvatarOptions = {
  audioPath: string;
  baseUrl: string;
  outputPath: string;
  photoPath: string;
  request?: LongCatFetchLike;
  timeoutMs?: number;
};

export const generateLongCatAvatar = async ({
  audioPath,
  baseUrl,
  outputPath,
  photoPath,
  request = fetch,
  timeoutMs = 1_800_000,
}: GenerateLongCatAvatarOptions): Promise<void> => {
  if (!existsSync(photoPath)) {
    throw new Error(`Missing LongCat portrait: ${photoPath}`);
  }
  if (!existsSync(audioPath)) {
    throw new Error(`Missing LongCat scene audio: ${audioPath}`);
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
    const response = await request(toLongCatUrl(baseUrl), {
      body: form,
      method: "POST",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`LongCat request failed with status ${response.status}.`);
    }

    const outputBuffer = Buffer.from(await response.arrayBuffer());
    if (outputBuffer.length === 0) {
      throw new Error("LongCat returned an empty avatar clip.");
    }

    mkdirSync(path.dirname(outputPath), { recursive: true });
    const temporaryPath = `${outputPath}.tmp`;
    writeFileSync(temporaryPath, outputBuffer);
    renameSync(temporaryPath, outputPath);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`LongCat request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    rmSync(`${outputPath}.tmp`, { force: true });
  }
};

const toLongCatUrl = (baseUrl: string): string =>
  new URL("generate", `${baseUrl.replace(/\/+$/, "")}/`).toString();
