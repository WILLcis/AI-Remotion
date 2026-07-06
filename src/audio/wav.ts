import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type WriteSilentWavOptions = {
  durationSeconds: number;
  outputPath: string;
  sampleRate?: number;
};

export const writeSilentWav = ({
  durationSeconds,
  outputPath,
  sampleRate = 24_000,
}: WriteSilentWavOptions): void => {
  if (durationSeconds <= 0) {
    throw new Error("durationSeconds must be greater than 0");
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });

  const channels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const sampleCount = Math.max(1, Math.round(durationSeconds * sampleRate));
  const dataSize = sampleCount * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);

  writeFileSync(outputPath, buffer);
};

export const readWavDurationSeconds = (filePath: string): number => {
  const buffer = readFileSync(filePath);

  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    throw new Error(`Not a WAV file: ${filePath}`);
  }

  let offset = 12;
  let sampleRate: number | null = null;
  let channels: number | null = null;
  let bitsPerSample: number | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;

    if (chunkId === "fmt ") {
      channels = buffer.readUInt16LE(chunkStart + 2);
      sampleRate = buffer.readUInt32LE(chunkStart + 4);
      bitsPerSample = buffer.readUInt16LE(chunkStart + 14);
    }

    if (chunkId === "data") {
      dataSize = chunkSize;
    }

    offset = chunkStart + chunkSize + (chunkSize % 2);
  }

  if (sampleRate === null || channels === null || bitsPerSample === null) {
    throw new Error(`Missing WAV fmt chunk: ${filePath}`);
  }

  if (dataSize === null) {
    throw new Error(`Missing WAV data chunk: ${filePath}`);
  }

  return dataSize / (sampleRate * channels * (bitsPerSample / 8));
};
