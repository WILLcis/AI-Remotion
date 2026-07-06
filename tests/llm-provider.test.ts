import { describe, expect, it } from "vitest";
import { resolveScriptGenerationMode } from "../src/agent/providers/llm";
import { loadRuntimeConfig } from "../src/config/runtimeConfig";

describe("LLM provider boundary", () => {
  it("uses deterministic script generation by default", () => {
    const config = loadRuntimeConfig({ env: {} });

    expect(resolveScriptGenerationMode(config.llm)).toEqual({
      provider: "deterministic",
      reason: "configured",
    });
  });

  it("falls back when OpenAI-compatible config is selected before adapter implementation", () => {
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

  it("fails clearly if fallback is disabled for an unimplemented external LLM", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_FALLBACK_TO_DETERMINISTIC: "false",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });

    expect(() => resolveScriptGenerationMode(config.llm)).toThrow(
      /not implemented yet/,
    );
  });
});
