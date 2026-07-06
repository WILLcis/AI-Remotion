import type { LlmRuntimeConfig } from "../../config/runtimeConfig";

export type ScriptGenerationMode = {
  provider: "deterministic";
  reason: "configured" | "fallback";
};

export type LlmTextMessage = {
  content: string;
  role: "system" | "user" | "assistant";
};

export type LlmGenerateTextOptions = {
  messages: LlmTextMessage[];
  temperature?: number;
};

export type LlmGenerateTextResult = {
  provider: string;
  text: string;
};

export type LlmProviderAdapter = {
  generateText: (
    options: LlmGenerateTextOptions,
  ) => Promise<LlmGenerateTextResult>;
  id: string;
};

export const resolveScriptGenerationMode = (
  config: LlmRuntimeConfig,
): ScriptGenerationMode => {
  if (config.provider === "deterministic") {
    return {
      provider: "deterministic",
      reason: "configured",
    };
  }

  if (config.fallbackToDeterministic) {
    return {
      provider: "deterministic",
      reason: "fallback",
    };
  }

  throw new Error(
    "OpenAI-compatible LLM generation is configured but not implemented yet. Enable AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC=true or use AI_REMOTION_LLM_PROVIDER=deterministic.",
  );
};
