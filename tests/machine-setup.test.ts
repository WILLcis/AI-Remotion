import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseDreaminaCreditCount,
  parseNodeMajor,
  runMachineSetup,
  type CommandResult,
  type MachineSetupDeps,
} from "../src/setup/machineSetup";

const ENV_EXAMPLE = `AI_REMOTION_LLM_PROVIDER=openai-compatible
AI_REMOTION_LLM_BASE_URL=https://api.deepseek.com
AI_REMOTION_LLM_API_KEY=
AI_REMOTION_LLM_MODEL=deepseek-v4-flash
`;

const tempRepo = (): string => {
  const dir = mkdtempSync(path.join(tmpdir(), "ai-remotion-setup-"));
  mkdirSync(path.join(dir, "config"), { recursive: true });
  mkdirSync(path.join(dir, "episodes/res/img"), { recursive: true });
  mkdirSync(path.join(dir, "episodes/res/audio"), { recursive: true });
  mkdirSync(path.join(dir, "node_modules/remotion"), { recursive: true });
  writeFileSync(path.join(dir, "config/.env.local.example"), ENV_EXAMPLE);
  writeFileSync(path.join(dir, "episodes/res/img/dh1.jpg"), "jpg");
  writeFileSync(path.join(dir, "episodes/res/audio/dg1.wav"), "wav");
  return dir;
};

const ok = (stdout = ""): CommandResult => ({
  code: 0,
  stdout,
  stderr: "",
});

const readyDeps = (
  cwd: string,
  overrides: Partial<MachineSetupDeps> = {},
): MachineSetupDeps => {
  const bins = new Set(["node", "ffmpeg", "ffprobe", "brew"]);
  return {
    applyFixes: true,
    cwd,
    env: {},
    exists: existsSync,
    copyFile: (from, to) => writeFileSync(to, readFileSync(from)),
    platform: "darwin",
    nodeVersion: "v22.0.0",
    which: (bin) => bins.has(bin),
    npmInstall: async () => ok(),
    brewInstall: async () => ok(),
    installDreaminaCli: async () => ok(),
    dreaminaHelp: async () => ok(),
    dreaminaCredit: async () => ok('{"credit_count": 80}'),
    readIdentityConfig: () => ({
      photo: "episodes/res/img/dh1.jpg",
      audio: "episodes/res/audio/dg1.wav",
    }),
    ...overrides,
  };
};

describe("machine setup", () => {
  it("parses node majors and dreamina credit counts", () => {
    expect(parseNodeMajor("v20.11.1")).toBe(20);
    expect(parseNodeMajor("22.1.0")).toBe(22);
    expect(parseDreaminaCreditCount('{"credit_count":75}')).toBe(75);
    expect(
      parseDreaminaCreditCount('{"commerce_info":{"credit_count":210}}'),
    ).toBe(210);
  });

  it("copies a missing .env.local and asks the human for the LLM key", async () => {
    const cwd = tempRepo();
    const report = await runMachineSetup(readyDeps(cwd));
    expect(report.status).toBe("needs_human");
    expect(report.human_blockers.map((item) => item.id)).toContain("llm_api_key");
    expect(readFileSync(path.join(cwd, ".env.local"), "utf8")).toContain(
      "AI_REMOTION_LLM_PROVIDER",
    );
    expect(JSON.stringify(report)).not.toMatch(/sk-/);
  });

  it("asks for Dreamina login in plain language and does not leak secrets", async () => {
    const cwd = tempRepo();
    writeFileSync(
      path.join(cwd, ".env.local"),
      `${ENV_EXAMPLE}AI_REMOTION_LLM_API_KEY=sk-test-secret-do-not-print\n`,
    );
    const report = await runMachineSetup(
      readyDeps(cwd, {
        env: { AI_REMOTION_LLM_API_KEY: "sk-test-secret-do-not-print" },
        dreaminaCredit: async () => ({
          code: 1,
          stdout: "",
          stderr: "please login",
        }),
      }),
    );
    expect(report.status).toBe("needs_human");
    expect(report.human_blockers).toEqual([
      expect.objectContaining({
        id: "dreamina_login",
        ask: expect.stringMatching(/即梦登录/),
      }),
    ]);
    const dumped = JSON.stringify(report);
    expect(dumped).not.toContain("sk-test-secret-do-not-print");
    expect(report.human_blockers[0]?.ask).not.toMatch(/curl |npm run|FLAG_/);
  });

  it("reports ready when toolchain, env, Dreamina credits, and identity files are present", async () => {
    const cwd = tempRepo();
    writeFileSync(
      path.join(cwd, ".env.local"),
      "AI_REMOTION_LLM_PROVIDER=openai-compatible\nAI_REMOTION_LLM_API_KEY=sk-ready\nAI_REMOTION_LLM_BASE_URL=https://api.deepseek.com\nAI_REMOTION_LLM_MODEL=x\n",
    );
    const report = await runMachineSetup(
      readyDeps(cwd, {
        env: {
          AI_REMOTION_LLM_PROVIDER: "openai-compatible",
          AI_REMOTION_LLM_API_KEY: "sk-ready",
          AI_REMOTION_LLM_BASE_URL: "https://api.deepseek.com",
          AI_REMOTION_LLM_MODEL: "x",
        },
      }),
    );
    expect(report.status).toBe("ready");
    expect(report.human_blockers).toEqual([]);
    expect(report.next_prompt).toMatch(/ready/i);
    expect(JSON.stringify(report)).not.toContain("sk-ready");
  });

  it("asks a human when ffmpeg is missing and Homebrew is not available", async () => {
    const cwd = tempRepo();
    writeFileSync(
      path.join(cwd, ".env.local"),
      "AI_REMOTION_LLM_PROVIDER=deterministic\n",
    );
    const report = await runMachineSetup(
      readyDeps(cwd, {
        which: (bin) => bin === "node" || bin === "ffprobe",
        brewInstall: async () => {
          throw new Error("brew should not run");
        },
      }),
    );
    expect(report.status).toBe("needs_human");
    expect(report.human_blockers.map((item) => item.id)).toContain("ffmpeg");
    expect(report.human_blockers.find((item) => item.id === "ffmpeg")?.ask).not.toMatch(
      /brew install/,
    );
  });

  it("does not fake success on Windows", async () => {
    const cwd = tempRepo();
    const report = await runMachineSetup(
      readyDeps(cwd, { platform: "win32" }),
    );
    expect(report.status).toBe("failed");
    expect(report.human_blockers[0]?.id).toBe("windows_unsupported");
  });

  it("asks when default identity media is missing", async () => {
    const cwd = tempRepo();
    writeFileSync(
      path.join(cwd, ".env.local"),
      "AI_REMOTION_LLM_PROVIDER=deterministic\n",
    );
    const report = await runMachineSetup(
      readyDeps(cwd, {
        exists: (filePath) =>
          existsSync(filePath) &&
          !filePath.endsWith("dh1.jpg") &&
          !filePath.endsWith("dg1.wav"),
      }),
    );
    expect(report.status).toBe("needs_human");
    expect(report.human_blockers.map((item) => item.id)).toContain(
      "identity_files",
    );
  });
});
