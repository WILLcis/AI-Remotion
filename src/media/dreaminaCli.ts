import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

export type DreaminaSpawnResult = {
  code: number | null;
  stderr: string;
  stdout: string;
};

export type DreaminaRunOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Inherit stdin and tee stdout/stderr so device-flow login is visible. */
  interactive?: boolean;
};

export type DreaminaRunner = (
  bin: string,
  args: string[],
  options?: DreaminaRunOptions,
) => Promise<DreaminaSpawnResult>;

export type DreaminaCliOptions = {
  bin?: string;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  run?: DreaminaRunner;
  interactive?: boolean;
};

/** Default video model after identity A/B: mini (720p, 4–15s). Override with --model_version seedance2.0fast or seedance2.0_vip. */
export const DEFAULT_DREAMINA_VIDEO_MODEL = "seedance2.0mini";

const defaultRunner: DreaminaRunner = (bin, args, options = {}) =>
  new Promise((resolve, reject) => {
    const interactive = options.interactive === true;
    const child = spawn(bin, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: [interactive ? "inherit" : "ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      if (interactive) {
        process.stdout.write(chunk);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      if (interactive) {
        process.stderr.write(chunk);
      }
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code, stderr, stdout });
    });
  });

export const resolveDreaminaBin = (
  env: NodeJS.ProcessEnv = process.env,
): string => env.AI_REMOTION_DREAMINA_BIN?.trim() || "dreamina";

export const runDreamina = async (
  args: string[],
  options: DreaminaCliOptions = {},
): Promise<DreaminaSpawnResult> => {
  const bin = options.bin ?? resolveDreaminaBin(options.env ?? process.env);
  const run = options.run ?? defaultRunner;
  return run(bin, args, {
    cwd: options.cwd,
    env: options.env,
    interactive: options.interactive,
  });
};

export const assertDreaminaAvailable = async (
  options: DreaminaCliOptions = {},
): Promise<void> => {
  const result = await runDreamina(["-h"], options);
  if (result.code !== 0) {
    throw new Error(
      [
        "dreamina CLI is unavailable or failed `dreamina -h`.",
        "Install with: curl -fsSL https://jimeng.jianying.com/cli | bash",
        "Then run: npm run media:dreamina -- login --account default",
        result.stderr.trim() || result.stdout.trim(),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }
};

export const dreaminaUserCredit = async (
  options: DreaminaCliOptions = {},
): Promise<DreaminaSpawnResult> => runDreamina(["user_credit"], options);

export const dreaminaLogin = async (
  options: DreaminaCliOptions = {},
): Promise<DreaminaSpawnResult> =>
  runDreamina(["login"], { ...options, interactive: options.interactive ?? true });

export const dreaminaLogout = async (
  options: DreaminaCliOptions = {},
): Promise<DreaminaSpawnResult> => runDreamina(["logout"], options);

export const dreaminaRelogin = async (
  options: DreaminaCliOptions = {},
): Promise<DreaminaSpawnResult> =>
  runDreamina(["relogin"], { ...options, interactive: options.interactive ?? true });

export const parseDreaminaCreditCount = (stdout: string): number | undefined => {
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      const nested = parsed.commerce_info;
      const candidates = [
        parsed.credit,
        parsed.credits,
        parsed.credit_count,
        parsed.total_credit,
        parsed.balance,
        nested && typeof nested === "object"
          ? (nested as { credit_count?: unknown }).credit_count
          : undefined,
      ];
      for (const value of candidates) {
        if (typeof value === "number" && Number.isFinite(value)) {
          return value;
        }
        if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
          return Number(value);
        }
      }
    } catch {
      // Fall through to regex.
    }
  }
  const labeled = stdout.match(/credit(?:_count|s)?["']?\s*[:=]\s*["']?(\d+)/i);
  if (labeled?.[1]) {
    return Number(labeled[1]);
  }
  return undefined;
};

export const parseDreaminaUserId = (stdout: string): string | undefined => {
  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (jsonMatch?.[0]) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      for (const key of ["user_id", "userId", "uid"]) {
        const value = parsed[key];
        if (typeof value === "number" && Number.isFinite(value)) {
          return String(value);
        }
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    } catch {
      // Fall through to regex.
    }
  }
  const labeled = stdout.match(/user[_-]?id["']?\s*[:=]\s*["']?(\d+)/i);
  return labeled?.[1];
};

export const dreaminaImage2Image = async (input: {
  approvePaid: boolean;
  downloadDir: string;
  imagePaths: string[];
  prompt: string;
  ratio?: string;
  resolutionType?: string;
  modelVersion?: string;
  pollSeconds?: number;
  options?: DreaminaCliOptions;
}): Promise<DreaminaSpawnResult> => {
  if (!input.approvePaid) {
    throw new Error(
      "Dreamina image2image is a paid cloud call. Pass approvePaid=true only after explicit user approval.",
    );
  }
  if (input.imagePaths.length === 0) {
    throw new Error("Dreamina image2image requires at least one image.");
  }
  mkdirSync(input.downloadDir, { recursive: true });
  const args = [
    "image2image",
    `--prompt=${input.prompt}`,
    `--ratio=${input.ratio ?? "9:16"}`,
    `--resolution_type=${input.resolutionType ?? "2k"}`,
    `--poll=${String(input.pollSeconds ?? 60)}`,
  ];
  if (input.modelVersion?.trim()) {
    args.push(`--model_version=${input.modelVersion.trim()}`);
  }
  for (const imagePath of input.imagePaths) {
    if (!existsSync(imagePath)) {
      throw new Error(`Dreamina image2image missing image: ${imagePath}`);
    }
    args.push(`--images=${path.resolve(imagePath)}`);
  }
  return runDreamina(args, input.options);
};

export const dreaminaText2Image = async (input: {
  downloadDir: string;
  pollSeconds?: number;
  prompt: string;
  ratio?: string;
  resolutionType?: string;
  approvePaid: boolean;
  options?: DreaminaCliOptions;
}): Promise<DreaminaSpawnResult> => {
  if (!input.approvePaid) {
    throw new Error(
      "Dreamina text2image is a paid cloud call. Pass approvePaid=true only after explicit user approval.",
    );
  }
  mkdirSync(input.downloadDir, { recursive: true });
  return runDreamina(
    [
      "text2image",
      `--prompt=${input.prompt}`,
      `--ratio=${input.ratio ?? "16:9"}`,
      `--resolution_type=${input.resolutionType ?? "2k"}`,
      `--poll=${String(input.pollSeconds ?? 60)}`,
    ],
    input.options,
  );
};

export const dreaminaImage2Video = async (input: {
  approvePaid: boolean;
  downloadDir: string;
  imagePath: string;
  pollSeconds?: number;
  prompt?: string;
  durationSeconds?: number;
  videoResolution?: string;
  modelVersion?: string;
  options?: DreaminaCliOptions;
}): Promise<DreaminaSpawnResult> => {
  if (!input.approvePaid) {
    throw new Error(
      "Dreamina image2video is a paid cloud call. Pass approvePaid=true only after explicit user approval.",
    );
  }
  if (!existsSync(input.imagePath)) {
    throw new Error(`Dreamina image2video missing image: ${input.imagePath}`);
  }
  mkdirSync(input.downloadDir, { recursive: true });
  const args = [
    "image2video",
    `--image=${path.resolve(input.imagePath)}`,
    `--duration=${String(input.durationSeconds ?? 5)}`,
    `--video_resolution=${input.videoResolution ?? "720p"}`,
    `--model_version=${input.modelVersion ?? DEFAULT_DREAMINA_VIDEO_MODEL}`,
    `--poll=${String(input.pollSeconds ?? 120)}`,
  ];
  if (input.prompt?.trim()) {
    args.push(`--prompt=${input.prompt.trim()}`);
  }
  return runDreamina(args, input.options);
};

export const dreaminaText2Video = async (input: {
  approvePaid: boolean;
  prompt: string;
  durationSeconds?: number;
  pollSeconds?: number;
  ratio?: string;
  videoResolution?: string;
  modelVersion?: string;
  options?: DreaminaCliOptions;
}): Promise<DreaminaSpawnResult> => {
  if (!input.approvePaid) {
    throw new Error(
      "Dreamina text2video is a paid cloud call. Pass approvePaid=true only after explicit user approval.",
    );
  }
  return runDreamina(
    [
      "text2video",
      `--prompt=${input.prompt}`,
      `--duration=${String(input.durationSeconds ?? 5)}`,
      `--ratio=${input.ratio ?? "9:16"}`,
      `--video_resolution=${input.videoResolution ?? "720p"}`,
      `--model_version=${input.modelVersion ?? DEFAULT_DREAMINA_VIDEO_MODEL}`,
      `--poll=${String(input.pollSeconds ?? 180)}`,
    ],
    input.options,
  );
};

export const dreaminaMultimodal2Video = async (input: {
  approvePaid: boolean;
  imagePaths?: string[];
  audioPaths?: string[];
  videoPaths?: string[];
  prompt?: string;
  durationSeconds?: number;
  pollSeconds?: number;
  ratio?: string;
  videoResolution?: string;
  modelVersion?: string;
  options?: DreaminaCliOptions;
}): Promise<DreaminaSpawnResult> => {
  if (!input.approvePaid) {
    throw new Error(
      "Dreamina multimodal2video is a paid cloud call. Pass approvePaid=true only after explicit user approval.",
    );
  }
  const args = [
    "multimodal2video",
    `--duration=${String(input.durationSeconds ?? 5)}`,
    `--ratio=${input.ratio ?? "9:16"}`,
    `--video_resolution=${input.videoResolution ?? "720p"}`,
    `--model_version=${input.modelVersion ?? DEFAULT_DREAMINA_VIDEO_MODEL}`,
    `--poll=${String(input.pollSeconds ?? 180)}`,
  ];
  for (const imagePath of input.imagePaths ?? []) {
    if (!existsSync(imagePath)) {
      throw new Error(`Dreamina multimodal2video missing image: ${imagePath}`);
    }
    args.push(`--image=${path.resolve(imagePath)}`);
  }
  for (const audioPath of input.audioPaths ?? []) {
    if (!existsSync(audioPath)) {
      throw new Error(`Dreamina multimodal2video missing audio: ${audioPath}`);
    }
    args.push(`--audio=${path.resolve(audioPath)}`);
  }
  for (const videoPath of input.videoPaths ?? []) {
    args.push(`--video=${path.resolve(videoPath)}`);
  }
  if (input.prompt?.trim()) {
    args.push(`--prompt=${input.prompt.trim()}`);
  }
  return runDreamina(args, input.options);
};

export const parseDreaminaSubmitId = (stdout: string): string | undefined => {
  const jsonMatch = stdout.match(/"submit_id"\s*:\s*"([^"]+)"/);
  if (jsonMatch?.[1]) {
    return jsonMatch[1];
  }
  const plain = stdout.match(/submit_id[=:\s]+([A-Za-z0-9-]+)/);
  return plain?.[1];
};

export const dreaminaQueryResult = async (input: {
  submitId: string;
  downloadDir: string;
  options?: DreaminaCliOptions;
}): Promise<DreaminaSpawnResult> => {
  mkdirSync(input.downloadDir, { recursive: true });
  return runDreamina(
    [
      "query_result",
      `--submit_id=${input.submitId}`,
      `--download_dir=${input.downloadDir}`,
    ],
    input.options,
  );
};
