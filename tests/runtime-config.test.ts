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

  it("recognizes CosyVoice as implemented and reports a missing local endpoint", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_TTS_PROVIDER: "cosyvoice",
        AI_REMOTION_TTS_VOICE: "中文女声",
      },
    });

    expect(getConfigSummary(config)).toContain("TTS implementation: ready");
    expect(getRuntimeConfigIssues(config).map((issue) => issue.code)).toEqual([
      "TTS_BASE_URL_MISSING",
    ]);
  });

  it("configures clone and avatar services without exposing endpoints in secrets", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_AVATAR_BASE_URL: "http://192.0.2.10:8001",
        AI_REMOTION_AVATAR_PROVIDER: "musetalk",
        AI_REMOTION_TTS_BASE_URL: "http://192.0.2.10:8000",
        AI_REMOTION_TTS_PROVIDER: "cosyvoice-clone",
      },
    });

    expect(config.tts.provider).toBe("cosyvoice-clone");
    expect(config.avatar).toMatchObject({
      baseUrl: "http://192.0.2.10:8001",
      provider: "musetalk",
    });
    expect(getRuntimeConfigIssues(config)).toEqual([]);
  });

  it("configures the local LatentSync avatar service", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_AVATAR_BASE_URL: "http://127.0.0.1:8004",
        AI_REMOTION_AVATAR_PROVIDER: "latentsync",
      },
    });

    expect(config.avatar).toMatchObject({
      baseUrl: "http://127.0.0.1:8004",
      provider: "latentsync",
    });
    expect(getRuntimeConfigIssues(config)).toEqual([]);
  });

  it("configures the local InfiniteTalk avatar service", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_AVATAR_BASE_URL: "http://127.0.0.1:8005",
        AI_REMOTION_AVATAR_PROVIDER: "infinitetalk",
      },
    });

    expect(config.avatar).toMatchObject({
      baseUrl: "http://127.0.0.1:8005",
      provider: "infinitetalk",
    });
    expect(getRuntimeConfigIssues(config)).toEqual([]);
  });

  it("configures the local LongCat avatar service", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_AVATAR_BASE_URL: "http://127.0.0.1:8006",
        AI_REMOTION_AVATAR_PROVIDER: "longcat",
      },
    });

    expect(config.avatar).toMatchObject({
      baseUrl: "http://127.0.0.1:8006",
      provider: "longcat",
    });
    expect(getRuntimeConfigIssues(config)).toEqual([]);
  });

  it("configures HeyGen without exposing its API key", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_AVATAR_PROVIDER: "heygen",
        AI_REMOTION_HEYGEN_POLL_INTERVAL_MS: "7000",
        HEYGEN_API_KEY: "heygen-test-secret",
      },
    });

    expect(config.avatar).toMatchObject({
      heygenBaseUrl: "https://api.heygen.com",
      heygenPollIntervalMs: 7000,
      provider: "heygen",
    });
    expect(getConfigSummary(config)).toContain("HeyGen API key: configured");
    expect(getConfigSummary(config)).not.toContain("heygen-test-secret");
    expect(getRuntimeConfigIssues(config)).toEqual([]);
  });

  it("reports missing HeyGen credentials before generation", () => {
    const config = loadRuntimeConfig({
      env: { AI_REMOTION_AVATAR_PROVIDER: "heygen" },
    });

    expect(getRuntimeConfigIssues(config).map((issue) => issue.code)).toEqual([
      "AVATAR_HEYGEN_API_KEY_MISSING",
    ]);
  });

  it("loads Seedance and TOS settings without exposing credentials", () => {
    const config = loadRuntimeConfig({
      env: {
        AI_REMOTION_ARK_API_KEY: "ark-test-secret",
        AI_REMOTION_ARK_MODEL: "doubao-seedance-2-0-260128",
        AI_REMOTION_AVATAR_PROVIDER: "seedance",
        AI_REMOTION_TOS_ACCESS_KEY_ID: "tos-access-key",
        AI_REMOTION_TOS_ACCESS_KEY_SECRET: "tos-secret",
        AI_REMOTION_TOS_BUCKET: "private-avatar-assets",
        AI_REMOTION_TOS_ENDPOINT: "tos-cn-beijing.volces.com",
        AI_REMOTION_TOS_REGION: "cn-beijing",
      },
    });

    expect(config.avatar).toMatchObject({
      arkModel: "doubao-seedance-2-0-260128",
      provider: "seedance",
      tosBucket: "private-avatar-assets",
      tosRegion: "cn-beijing",
    });
    expect(getConfigSummary(config)).not.toContain("ark-test-secret");
    expect(getConfigSummary(config)).not.toContain("tos-secret");
    expect(getRuntimeConfigIssues(config)).toEqual([]);
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
