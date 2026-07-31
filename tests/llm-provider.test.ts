import { describe, expect, it } from "vitest";
import {
  createOpenAiCompatibleLlmAdapter,
  generateScriptWithProvider,
  resolveScriptGenerationMode,
} from "../src/agent/providers/llm";
import { loadRuntimeConfig } from "../src/config/runtimeConfig";

describe("LLM provider boundary", () => {
  it("uses deterministic script generation by default", () => {
    const config = loadRuntimeConfig({ env: {} });

    expect(resolveScriptGenerationMode(config.llm)).toEqual({
      provider: "deterministic",
      reason: "configured",
    });
  });

  it("falls back when OpenAI-compatible configuration is incomplete", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC: "true",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });

    expect(resolveScriptGenerationMode(config.llm)).toEqual({
      provider: "deterministic",
      reason: "fallback",
    });
  });

  it("sends OpenAI-compatible chat completion requests", async () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_API_KEY: "test-key",
        AI_REMOTION_LLM_BASE_URL: "https://api.deepseek.com",
        AI_REMOTION_LLM_MODEL: "deepseek-v4-flash",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });
    let requestUrl = "";
    let requestInit: RequestInit | undefined;
    const adapter = createOpenAiCompatibleLlmAdapter(config.llm, async (url, init) => {
      requestUrl = url;
      requestInit = init;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  "# Demo\n\n## Segment 1\n\nSpoken: 你好\n\nVisual: 标题卡\n\nDuration: 3s",
              },
            },
          ],
        }),
      );
    });

    const result = await adapter.generateText({
      messages: [{ content: "hello", role: "user" }],
    });

    expect(requestUrl).toBe("https://api.deepseek.com/chat/completions");
    expect(requestInit?.headers).toMatchObject({
      Authorization: "Bearer test-key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(requestInit?.body))).toMatchObject({
      model: "deepseek-v4-flash",
      temperature: 0.4,
    });
    expect(result.provider).toBe("openai-compatible");
  });

  it("falls back after an external provider failure", async () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_API_KEY: "test-key",
        AI_REMOTION_LLM_BASE_URL: "https://api.deepseek.com",
        AI_REMOTION_LLM_MODEL: "deepseek-v4-flash",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });

    await expect(
      generateScriptWithProvider({
        config: config.llm,
        deterministicScript: () => "# Fallback\n\n## Segment 1\n\nSpoken: 本地\n",
        messages: [{ content: "hello", role: "user" }],
        request: async () => new Response("", { status: 503 }),
      }),
    ).resolves.toEqual({
      provider: "deterministic",
      reason: "fallback",
      text: "# Fallback\n\n## Segment 1\n\nSpoken: 本地\n",
    });
  });

  it("falls back for malformed scripts and reports timeouts clearly", async () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_API_KEY: "test-key",
        AI_REMOTION_LLM_BASE_URL: "https://api.deepseek.com",
        AI_REMOTION_LLM_MODEL: "deepseek-v4-flash",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });

    await expect(
      generateScriptWithProvider({
        config: config.llm,
        deterministicScript: () => "# Fallback\n\n## Segment 1\n\nSpoken: 本地\n",
        messages: [{ content: "hello", role: "user" }],
        request: async () =>
          new Response(
            JSON.stringify({
              choices: [{ message: { content: "This is not a script." } }],
            }),
          ),
      }),
    ).resolves.toMatchObject({
      provider: "deterministic",
      reason: "fallback",
    });

    await expect(
      createOpenAiCompatibleLlmAdapter(config.llm, async () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }).generateText({
        messages: [{ content: "hello", role: "user" }],
      }),
    ).rejects.toThrow(/timed out/);
  });

  it("fails clearly if fallback is disabled for an unavailable external LLM", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC: "false",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });

    expect(() => resolveScriptGenerationMode(config.llm)).toThrow(
      /requires AI_REMOTION_LLM_API_KEY/,
    );
  });
});
