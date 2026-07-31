import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

export const llmProviderSchema = z.enum([
  "deterministic",
  "openai-compatible",
]);

export const ttsProviderSchema = z.enum([
  "silent",
  "macos-say",
  "cosyvoice",
  "cosyvoice-clone",
  "edge-tts",
  "doubao",
  "azure",
  "elevenlabs",
]);

export type LlmProvider = z.infer<typeof llmProviderSchema>;
export type TtsProvider = z.infer<typeof ttsProviderSchema>;

export type RuntimeEnv = Record<string, string | undefined>;

export type LlmRuntimeConfig = {
  apiKey?: string;
  baseUrl?: string;
  fallbackToDeterministic: boolean;
  model?: string;
  provider: LlmProvider;
  requestTimeoutMs: number;
  temperature: number;
};

export type TtsRuntimeConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  provider: TtsProvider;
  requestTimeoutMs: number;
  voice?: string;
};

export const avatarProviderSchema = z.enum([
  "none",
  "musetalk",
  "seedance",
  "latentsync",
  "infinitetalk",
  "longcat",
  "heygen",
]);

export type AvatarProvider = z.infer<typeof avatarProviderSchema>;

export type AvatarRuntimeConfig = {
  arkApiKey?: string;
  arkBaseUrl: string;
  arkModel?: string;
  baseUrl?: string;
  heygenApiKey?: string;
  heygenBaseUrl: string;
  heygenPollIntervalMs: number;
  provider: AvatarProvider;
  requestTimeoutMs: number;
  seedanceAvatarAssetId?: string;
  tosAccessKeyId?: string;
  tosAccessKeySecret?: string;
  tosBucket?: string;
  tosEndpoint?: string;
  tosPrefix: string;
  tosRegion?: string;
  tosSessionToken?: string;
};

export type RuntimeConfig = {
  avatar: AvatarRuntimeConfig;
  llm: LlmRuntimeConfig;
  tts: TtsRuntimeConfig;
};

export type RuntimeConfigIssue = {
  code:
    | "LLM_API_KEY_MISSING"
    | "LLM_BASE_URL_MISSING"
    | "LLM_MODEL_MISSING"
    | "TTS_BASE_URL_MISSING"
    | "TTS_PROVIDER_PENDING"
    | "AVATAR_BASE_URL_MISSING"
    | "AVATAR_ARK_API_KEY_MISSING"
    | "AVATAR_ARK_MODEL_MISSING"
    | "AVATAR_HEYGEN_API_KEY_MISSING"
    | "AVATAR_TOS_CONFIG_MISSING";
  message: string;
  severity: "info" | "warn" | "error";
};

export type LoadRuntimeConfigOptions = {
  env?: RuntimeEnv;
};

export const loadRuntimeConfig = ({
  env = process.env,
}: LoadRuntimeConfigOptions = {}): RuntimeConfig => {
  const mergedEnv = {
    ...loadEnvFile(env.AI_REMOTION_ENV_FILE),
    ...env,
  };

  return {
    avatar: {
      arkApiKey: emptyToUndefined(mergedEnv.AI_REMOTION_ARK_API_KEY),
      arkBaseUrl:
        emptyToUndefined(mergedEnv.AI_REMOTION_ARK_BASE_URL) ??
        "https://ark.cn-beijing.volces.com/api/v3",
      arkModel: emptyToUndefined(mergedEnv.AI_REMOTION_ARK_MODEL),
      baseUrl: emptyToUndefined(mergedEnv.AI_REMOTION_AVATAR_BASE_URL),
      heygenApiKey: emptyToUndefined(mergedEnv.HEYGEN_API_KEY),
      heygenBaseUrl:
        emptyToUndefined(mergedEnv.AI_REMOTION_HEYGEN_BASE_URL) ??
        "https://api.heygen.com",
      heygenPollIntervalMs: parsePositiveInteger(
        mergedEnv.AI_REMOTION_HEYGEN_POLL_INTERVAL_MS,
        5_000,
      ),
      provider: parseAvatarProvider(mergedEnv.AI_REMOTION_AVATAR_PROVIDER),
      requestTimeoutMs: parsePositiveInteger(
        mergedEnv.AI_REMOTION_AVATAR_TIMEOUT_MS,
        300_000,
      ),
      seedanceAvatarAssetId: emptyToUndefined(
        mergedEnv.AI_REMOTION_SEEDANCE_AVATAR_ASSET_ID,
      ),
      tosAccessKeyId: emptyToUndefined(mergedEnv.AI_REMOTION_TOS_ACCESS_KEY_ID),
      tosAccessKeySecret: emptyToUndefined(
        mergedEnv.AI_REMOTION_TOS_ACCESS_KEY_SECRET,
      ),
      tosBucket: emptyToUndefined(mergedEnv.AI_REMOTION_TOS_BUCKET),
      tosEndpoint: emptyToUndefined(mergedEnv.AI_REMOTION_TOS_ENDPOINT),
      tosPrefix:
        emptyToUndefined(mergedEnv.AI_REMOTION_TOS_PREFIX) ?? "ai-remotion",
      tosRegion: emptyToUndefined(mergedEnv.AI_REMOTION_TOS_REGION),
      tosSessionToken: emptyToUndefined(mergedEnv.AI_REMOTION_TOS_SESSION_TOKEN),
    },
    llm: {
      apiKey: emptyToUndefined(mergedEnv.AI_REMOTION_LLM_API_KEY),
      baseUrl: emptyToUndefined(mergedEnv.AI_REMOTION_LLM_BASE_URL),
      fallbackToDeterministic: parseBoolean(
        mergedEnv.AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC,
        true,
      ),
      model: emptyToUndefined(mergedEnv.AI_REMOTION_LLM_MODEL),
      provider: parseLlmProvider(mergedEnv.AI_REMOTION_LLM_PROVIDER),
      requestTimeoutMs: parsePositiveInteger(
        mergedEnv.AI_REMOTION_LLM_TIMEOUT_MS,
        60_000,
      ),
      temperature: parseNumberInRange(
        mergedEnv.AI_REMOTION_LLM_TEMPERATURE,
        0,
        2,
        0.4,
      ),
    },
    tts: {
      apiKey: emptyToUndefined(mergedEnv.AI_REMOTION_TTS_API_KEY),
      baseUrl: emptyToUndefined(mergedEnv.AI_REMOTION_TTS_BASE_URL),
      model: emptyToUndefined(mergedEnv.AI_REMOTION_TTS_MODEL),
      provider: parseTtsProvider(mergedEnv.AI_REMOTION_TTS_PROVIDER),
      requestTimeoutMs: parsePositiveInteger(
        mergedEnv.AI_REMOTION_TTS_TIMEOUT_MS,
        60_000,
      ),
      voice: emptyToUndefined(mergedEnv.AI_REMOTION_TTS_VOICE),
    },
  };
};

export const getConfigSummary = (config: RuntimeConfig): string => {
  return [
    `LLM provider: ${config.llm.provider}`,
    `LLM model: ${config.llm.model ?? "not configured"}`,
    `LLM base URL: ${config.llm.baseUrl ?? "not configured"}`,
    `LLM API key: ${config.llm.apiKey ? "configured" : "not configured"}`,
    `LLM fallback: ${
      config.llm.fallbackToDeterministic ? "deterministic" : "disabled"
    }`,
    `TTS provider: ${config.tts.provider}`,
    `TTS voice: ${config.tts.voice ?? "not configured"}`,
    `TTS API key: ${config.tts.apiKey ? "configured" : "not configured"}`,
    `TTS implementation: ${isImplementedTtsProvider(config.tts.provider) ? "ready" : "pending"}`,
    `Avatar provider: ${config.avatar.provider}`,
    `Avatar base URL: ${config.avatar.baseUrl ?? "not configured"}`,
    `Ark API key: ${config.avatar.arkApiKey ? "configured" : "not configured"}`,
    `Ark model: ${config.avatar.arkModel ?? "not configured"}`,
    `HeyGen API key: ${config.avatar.heygenApiKey ? "configured" : "not configured"}`,
    `HeyGen base URL: ${config.avatar.heygenBaseUrl}`,
    `TOS bucket: ${config.avatar.tosBucket ?? "not configured"}`,
  ].join("\n");
};

export const getRuntimeConfigIssues = (
  config: RuntimeConfig,
): RuntimeConfigIssue[] => {
  const issues: RuntimeConfigIssue[] = [];

  if (config.llm.provider === "openai-compatible") {
    if (!config.llm.apiKey) {
      issues.push({
        code: "LLM_API_KEY_MISSING",
        message:
          "AI_REMOTION_LLM_API_KEY is required before using the OpenAI-compatible LLM provider.",
        severity: "warn",
      });
    }

    if (!config.llm.baseUrl) {
      issues.push({
        code: "LLM_BASE_URL_MISSING",
        message:
          "AI_REMOTION_LLM_BASE_URL is required before using the OpenAI-compatible LLM provider.",
        severity: "warn",
      });
    }

    if (!config.llm.model) {
      issues.push({
        code: "LLM_MODEL_MISSING",
        message:
          "AI_REMOTION_LLM_MODEL is required before using the OpenAI-compatible LLM provider.",
        severity: "warn",
      });
    }
  }

  if (!isImplementedTtsProvider(config.tts.provider)) {
    issues.push({
      code: "TTS_PROVIDER_PENDING",
      message: `TTS provider ${config.tts.provider} is configurable but not implemented yet.`,
      severity: "info",
    });
  }

  if (
    (config.tts.provider === "cosyvoice" ||
      config.tts.provider === "cosyvoice-clone") &&
    !config.tts.baseUrl
  ) {
    issues.push({
      code: "TTS_BASE_URL_MISSING",
      message:
        "AI_REMOTION_TTS_BASE_URL is required before using a CosyVoice provider.",
      severity: "warn",
    });
  }

  if (
    (config.avatar.provider === "musetalk" ||
      config.avatar.provider === "latentsync" ||
      config.avatar.provider === "infinitetalk" ||
      config.avatar.provider === "longcat") &&
    !config.avatar.baseUrl
  ) {
    issues.push({
      code: "AVATAR_BASE_URL_MISSING",
      message:
        `AI_REMOTION_AVATAR_BASE_URL is required before using the ${config.avatar.provider} provider.`,
      severity: "warn",
    });
  }

  if (config.avatar.provider === "seedance") {
    if (!config.avatar.arkApiKey) {
      issues.push({
        code: "AVATAR_ARK_API_KEY_MISSING",
        message: "AI_REMOTION_ARK_API_KEY is required for Seedance.",
        severity: "warn",
      });
    }

    if (!config.avatar.arkModel) {
      issues.push({
        code: "AVATAR_ARK_MODEL_MISSING",
        message: "AI_REMOTION_ARK_MODEL is required for Seedance.",
        severity: "warn",
      });
    }

    if (
      !config.avatar.tosAccessKeyId ||
      !config.avatar.tosAccessKeySecret ||
      !config.avatar.tosBucket ||
      !config.avatar.tosEndpoint ||
      !config.avatar.tosRegion
    ) {
      issues.push({
        code: "AVATAR_TOS_CONFIG_MISSING",
        message:
          "AI_REMOTION_TOS_ACCESS_KEY_ID, AI_REMOTION_TOS_ACCESS_KEY_SECRET, AI_REMOTION_TOS_BUCKET, AI_REMOTION_TOS_ENDPOINT, and AI_REMOTION_TOS_REGION are required for Seedance.",
        severity: "warn",
      });
    }
  }

  if (config.avatar.provider === "heygen" && !config.avatar.heygenApiKey) {
    issues.push({
      code: "AVATAR_HEYGEN_API_KEY_MISSING",
      message: "HEYGEN_API_KEY is required for HeyGen.",
      severity: "warn",
    });
  }

  return issues;
};

export const parseEnvText = (source: string): RuntimeEnv => {
  const env: RuntimeEnv = {};

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const [rawKey, ...rawValueParts] = line.split("=");
    const key = rawKey.trim();
    const rawValue = rawValueParts.join("=").trim();

    if (!key) {
      continue;
    }

    env[key] = stripQuotes(rawValue);
  }

  return env;
};

export const isImplementedTtsProvider = (provider: TtsProvider): boolean => {
  return (
    provider === "silent" ||
    provider === "macos-say" ||
    provider === "cosyvoice" ||
    provider === "cosyvoice-clone"
  );
};

const loadEnvFile = (envFile: string | undefined): RuntimeEnv => {
  if (!envFile) {
    return {};
  }

  if (!existsSync(envFile)) {
    throw new Error(`Configured env file does not exist: ${envFile}`);
  }

  return parseEnvText(readFileSync(envFile, "utf8"));
};

const parseLlmProvider = (value: string | undefined): LlmProvider => {
  return llmProviderSchema.parse(emptyToUndefined(value) ?? "deterministic");
};

const parseTtsProvider = (value: string | undefined): TtsProvider => {
  return ttsProviderSchema.parse(emptyToUndefined(value) ?? "silent");
};

const parseAvatarProvider = (value: string | undefined): AvatarProvider => {
  return avatarProviderSchema.parse(emptyToUndefined(value) ?? "none");
};

const parseBoolean = (value: string | undefined, defaultValue: boolean): boolean => {
  const normalized = emptyToUndefined(value)?.toLowerCase();
  if (normalized === undefined) {
    return defaultValue;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean value: ${value}`);
};

const parsePositiveInteger = (
  value: string | undefined,
  defaultValue: number,
): number => {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) {
    return defaultValue;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, got: ${value}`);
  }

  return parsed;
};

const parseNumberInRange = (
  value: string | undefined,
  min: number,
  max: number,
  defaultValue: number,
): number => {
  const normalized = emptyToUndefined(value);
  if (normalized === undefined) {
    return defaultValue;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Expected a number between ${min} and ${max}, got: ${value}`);
  }

  return parsed;
};

const emptyToUndefined = (value: string | undefined): string | undefined => {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return value.trim();
};

const stripQuotes = (value: string): string => {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
};
