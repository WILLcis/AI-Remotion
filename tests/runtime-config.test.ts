import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getConfigSummary,
  getRuntimeConfigIssues,
  loadRuntimeConfig,
  parseEnvText,
} from "../src/config/runtimeConfig";

describe("runtime config", () => {
  it("defaults to local deterministic LLM and silent TTS providers", () => {
    const config = loadRuntimeConfig({ env: {} });

    expect(config.llm).toMatchObject({
      fallbackToDeterministic: true,
      provider: "deterministic",
    });
    expect(config.tts).toMatchObject({
      provider: "silent",
    });
  });

  it("loads OpenAI-compatible LLM placeholders without leaking secrets", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_LLM_API_KEY: "sk-test-secret",
        AI_REMOTION_LLM_BASE_URL: "https://api.example.test/v1",
        AI_REMOTION_LLM_MODEL: "demo-model",
        AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      },
    });
    const summary = getConfigSummary(config);

    expect(config.llm).toMatchObject({
      apiKey: "sk-test-secret",
      baseUrl: "https://api.example.test/v1",
      model: "demo-model",
      provider: "openai-compatible",
    });
    expect(summary).toContain("LLM provider: openai-compatible");
    expect(summary).toContain("LLM API key: configured");
    expect(summary).not.toContain("sk-test-secret");
  });

  it("reports missing external provider configuration without blocking defaults", () => {
    expect(getRuntimeConfigIssues(loadRuntimeConfig({ env: {} }))).toEqual([]);

    const issues = getRuntimeConfigIssues(
      loadRuntimeConfig({
        env: {
          AI_REMOTION_LLM_PROVIDER: "openai-compatible",
          AI_REMOTION_TTS_PROVIDER: "doubao",
        },
      }),
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "LLM_API_KEY_MISSING",
      "LLM_BASE_URL_MISSING",
      "LLM_MODEL_MISSING",
      "TTS_PROVIDER_PENDING",
    ]);
  });

  it("keeps external TTS providers configurable but not implemented by default", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_TTS_API_KEY: "tts-secret",
        AI_REMOTION_TTS_PROVIDER: "edge-tts",
        AI_REMOTION_TTS_VOICE: "zh-CN-XiaoxiaoNeural",
      },
    });
    const summary = getConfigSummary(config);

    expect(config.tts).toMatchObject({
      apiKey: "tts-secret",
      provider: "edge-tts",
      voice: "zh-CN-XiaoxiaoNeural",
    });
    expect(summary).toContain("TTS provider: edge-tts");
    expect(summary).toContain("TTS implementation: pending");
    expect(summary).not.toContain("tts-secret");
  });

  it("loads an env file when explicitly requested", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-env-"));
    const envFile = path.join(tempDir, ".env");

    try {
      writeFileSync(
        envFile,
        [
          "# local-only placeholders",
          "AI_REMOTION_LLM_PROVIDER=openai-compatible",
          'AI_REMOTION_LLM_MODEL="quoted-model"',
          "AI_REMOTION_LLM_API_KEY=placeholder",
        ].join("\n"),
      );

      const config = loadRuntimeConfig({
        env: {
          AI_REMOTION_ENV_FILE: envFile,
        },
      });

      expect(config.llm.provider).toBe("openai-compatible");
      expect(config.llm.model).toBe("quoted-model");
      expect(config.llm.apiKey).toBe("placeholder");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });

  it("parses simple dotenv syntax", () => {
    expect(
      parseEnvText([
        "AI_REMOTION_LLM_PROVIDER=openai-compatible",
        "EMPTY_VALUE=",
        "QUOTED='hello world'",
        "# comment",
      ].join("\n")),
    ).toEqual({
      AI_REMOTION_LLM_PROVIDER: "openai-compatible",
      EMPTY_VALUE: "",
      QUOTED: "hello world",
    });
  });
});
