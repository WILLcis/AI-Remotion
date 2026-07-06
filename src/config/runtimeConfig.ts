import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";

export const llmProviderSchema = z.enum([
  "deterministic",
  "openai-compatible",
]);

export const ttsProviderSchema = z.enum([
  "silent",
  "macos-say",
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

export type RuntimeConfig = {
  llm: LlmRuntimeConfig;
  tts: TtsRuntimeConfig;
};

export type RuntimeConfigIssue = {
  code:
    | "LLM_API_KEY_MISSING"
    | "LLM_BASE_URL_MISSING"
    | "LLM_MODEL_MISSING"
    | "TTS_PROVIDER_PENDING";
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
  return provider === "silent" || provider === "macos-say";
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
