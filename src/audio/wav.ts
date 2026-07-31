import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export type WriteSilentWavOptions = {
  durationSeconds: number;
  outputPath: string;
  sampleRate?: number;
};

export type PcmS16leToWavOptions = {
  channels?: number;
  sampleRate: number;
};

export const pcmS16leToWav = (
  pcm: Buffer,
  { channels = 1, sampleRate }: PcmS16leToWavOptions,
): Buffer => {
  if (pcm.length === 0) {
    throw new Error("CosyVoice returned empty PCM audio.");
  }

  if (pcm.length % 2 !== 0) {
    throw new Error("CosyVoice PCM audio must contain whole 16-bit PCM samples.");
  }

  if (channels <= 0 || sampleRate <= 0) {
    throw new Error("WAV channel count and sample rate must be greater than 0.");
  }

  return createPcmWavBuffer({
    channels,
    pcm,
    sampleRate,
  });
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
  const bytesPerSample = 2;
  const sampleCount = Math.max(1, Math.round(durationSeconds * sampleRate));
  const pcm = Buffer.alloc(sampleCount * channels * bytesPerSample);
  writeFileSync(outputPath, createPcmWavBuffer({ channels, pcm, sampleRate }));
};

export const concatPcmS16leWavs = ({
  inputPaths,
  outputPath,
}: {
  inputPaths: string[];
  outputPath: string;
}): void => {
  if (inputPaths.length === 0) {
    throw new Error("At least one WAV segment is required.");
  }

  const segments = inputPaths.map(readPcmS16leWav);
  const reference = segments[0];
  if (
    segments.some(
      (segment) =>
        segment.channels !== reference.channels ||
        segment.sampleRate !== reference.sampleRate,
    )
  ) {
    throw new Error("WAV segments must share sample rate and channel count.");
  }

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(
    outputPath,
    createPcmWavBuffer({
      channels: reference.channels,
      pcm: Buffer.concat(segments.map((segment) => segment.pcm)),
      sampleRate: reference.sampleRate,
    }),
  );
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

const readPcmS16leWav = (
  filePath: string,
): { channels: number; pcm: Buffer; sampleRate: number } => {
  const buffer = readFileSync(filePath);
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE" ||
    buffer.toString("ascii", 12, 16) !== "fmt " ||
    buffer.toString("ascii", 36, 40) !== "data"
  ) {
    throw new Error(`Expected a PCM WAV file: ${filePath}`);
  }

  const audioFormat = buffer.readUInt16LE(20);
  const channels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);
  const dataSize = buffer.readUInt32LE(40);
  const pcm = buffer.subarray(44);

  if (
    audioFormat !== 1 ||
    bitsPerSample !== 16 ||
    dataSize !== pcm.length ||
    pcm.length === 0
  ) {
    throw new Error(`Expected non-empty signed 16-bit PCM WAV: ${filePath}`);
  }

  return { channels, pcm, sampleRate };
};

const createPcmWavBuffer = ({
  channels,
  pcm,
  sampleRate,
}: {
  channels: number;
  pcm: Buffer;
  sampleRate: number;
}): Buffer => {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const buffer = Buffer.alloc(44 + pcm.length);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + pcm.length, 4);
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
  buffer.writeUInt32LE(pcm.length, 40);
  pcm.copy(buffer, 44);

  return buffer;
};
