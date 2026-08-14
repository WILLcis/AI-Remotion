import type { LlmRuntimeConfig } from "../../config/runtimeConfig";

export type ScriptGenerationMode = {
  provider: "deterministic" | "openai-compatible";
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

export type FetchLike = (
  input: string,
  init: RequestInit,
) => Promise<{
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export type GenerateTextWithProviderOptions = {
  config: LlmRuntimeConfig;
  deterministicText: () => string;
  messages: LlmTextMessage[];
  request?: FetchLike;
};

export type GenerateScriptWithProviderOptions = {
  config: LlmRuntimeConfig;
  deterministicScript: () => string;
  messages: LlmTextMessage[];
  request?: FetchLike;
};

export type GeneratedScript = {
  provider: ScriptGenerationMode["provider"];
  reason: ScriptGenerationMode["reason"];
  text: string;
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

  if (hasOpenAiCompatibleConfig(config)) {
    return {
      provider: "openai-compatible",
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
    "OpenAI-compatible LLM generation requires AI_REMOTION_LLM_API_KEY, AI_REMOTION_LLM_BASE_URL, and AI_REMOTION_LLM_MODEL. Enable AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC=true or use AI_REMOTION_LLM_PROVIDER=deterministic.",
  );
};

export const generateTextWithProvider = async ({
  config,
  deterministicText,
  messages,
  request = fetch,
}: GenerateTextWithProviderOptions): Promise<GeneratedScript> => {
  const mode = resolveScriptGenerationMode(config);

  if (mode.provider === "deterministic") {
    return {
      ...mode,
      text: deterministicText(),
    };
  }

  try {
    const result = await createOpenAiCompatibleLlmAdapter(config, request).generateText({
      messages,
      temperature: config.temperature,
    });

    return {
      ...mode,
      text: result.text,
    };
  } catch (error) {
    if (!config.fallbackToDeterministic) {
      throw error;
    }

    return {
      provider: "deterministic",
      reason: "fallback",
      text: deterministicText(),
    };
  }
};

export const generateScriptWithProvider = async ({
  config,
  deterministicScript,
  messages,
  request = fetch,
}: GenerateScriptWithProviderOptions): Promise<GeneratedScript> => {
  const result = await generateTextWithProvider({
    config,
    deterministicText: deterministicScript,
    messages,
    request,
  });

  if (result.provider !== "openai-compatible") {
    return result;
  }

  try {
    assertReviewableScript(result.text);
    return result;
  } catch (error) {
    if (!config.fallbackToDeterministic) {
      throw error;
    }

    return {
      provider: "deterministic",
      reason: "fallback",
      text: deterministicScript(),
    };
  }
};

export const createOpenAiCompatibleLlmAdapter = (
  config: LlmRuntimeConfig,
  request: FetchLike = fetch,
): LlmProviderAdapter => {
  if (!hasOpenAiCompatibleConfig(config)) {
    throw new Error(
      "OpenAI-compatible LLM generation requires AI_REMOTION_LLM_API_KEY, AI_REMOTION_LLM_BASE_URL, and AI_REMOTION_LLM_MODEL.",
    );
  }

  return {
    id: "openai-compatible",
    generateText: async ({ messages, temperature = config.temperature }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

      try {
        const response = await request(toChatCompletionsUrl(config.baseUrl), {
          body: JSON.stringify({
            messages,
            model: config.model,
            temperature,
          }),
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`OpenAI-compatible LLM request failed with status ${response.status}.`);
        }

        const text = readChatCompletionText(await response.json());
        return {
          provider: "openai-compatible",
          text,
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(
            `OpenAI-compatible LLM request timed out after ${config.requestTimeoutMs}ms.`,
          );
        }

        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
};

const hasOpenAiCompatibleConfig = (config: LlmRuntimeConfig): boolean => {
  return Boolean(config.apiKey && config.baseUrl && config.model);
};

const toChatCompletionsUrl = (baseUrl: string | undefined): string => {
  if (!baseUrl) {
    throw new Error("AI_REMOTION_LLM_BASE_URL is required.");
  }

  return new URL("chat/completions", `${baseUrl.replace(/\/+$/, "")}/`).toString();
};

const readChatCompletionText = (payload: unknown): string => {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("choices" in payload) ||
    !Array.isArray(payload.choices)
  ) {
    throw new Error("OpenAI-compatible LLM response did not contain choices.");
  }

  const content = payload.choices[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("OpenAI-compatible LLM response did not contain text content.");
  }

  return content.trim();
};

const assertReviewableScript = (script: string): void => {
  if (!/^#\s+.+/m.test(script) || !/^##\s+Segment\s+\d+/m.test(script)) {
    throw new Error(
      "OpenAI-compatible LLM response is not a reviewable script with a title and Segment sections.",
    );
  }
};
