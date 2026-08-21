import { execFile, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { loadRuntimeConfig } from "../config/runtimeConfig";
import {
  DEFAULT_HOTSPOT_AUDIO_REL,
  DEFAULT_HOTSPOT_PHOTO_REL,
} from "../hotspot/identity";
import {
  assertDreaminaAvailable,
  dreaminaUserCredit,
  parseDreaminaCreditCount,
  type DreaminaCliOptions,
} from "../media/dreaminaCli";

export { parseDreaminaCreditCount } from "../media/dreaminaCli";

const execFileAsync = promisify(execFile);

export const DREAMINA_CLI_INSTALL = "curl -fsSL https://jimeng.jianying.com/cli | bash";
export const ENV_EXAMPLE_REL = "config/.env.local.example";
export const ENV_LOCAL_REL = ".env.local";
export const IDENTITY_CONFIG_REL = "config/hotspot-identity.json";

export type SetupStatus = "ready" | "needs_human" | "failed";

export type HumanBlocker = {
  id: string;
  ask: string;
};

export type MachineSetupReport = {
  status: SetupStatus;
  agent_actions: string[];
  human_blockers: HumanBlocker[];
  next_prompt: string;
};

export type CommandResult = {
  code: number | null;
  stderr: string;
  stdout: string;
};

export type MachineSetupDeps = {
  applyFixes: boolean;
  cwd: string;
  env: NodeJS.ProcessEnv;
  exists: (filePath: string) => boolean;
  copyFile: (from: string, to: string) => void;
  platform: NodeJS.Platform;
  nodeVersion: string;
  which: (bin: string) => boolean;
  npmInstall: () => Promise<CommandResult>;
  brewInstall: (pkg: string) => Promise<CommandResult>;
  installDreaminaCli: () => Promise<CommandResult>;
  dreaminaHelp: () => Promise<CommandResult>;
  dreaminaCredit: () => Promise<CommandResult>;
  readIdentityConfig: () => { photo?: string; audio?: string };
};

const MIN_NODE_MAJOR = 20;

export const parseNodeMajor = (version: string): number | undefined => {
  const match = version.trim().match(/^v?(\d+)/);
  if (!match?.[1]) {
    return undefined;
  }
  return Number(match[1]);
};

export const isDreaminaLoginRequired = (
  result: CommandResult,
): boolean => {
  if (result.code === 0) {
    return false;
  }
  const blob = `${result.stdout} ${result.stderr}`;
  return /未登录|please\s*login|not\s*login|login\s*required|unauthorized|auth/i.test(
    blob,
  );
};

const whichOnPath = (bin: string): boolean => {
  const result = spawnSync("which", [bin], { encoding: "utf8" });
  return result.status === 0;
};

const spawnCommand = async (
  bin: string,
  args: string[],
  options: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean } = {},
): Promise<CommandResult> => {
  try {
    const result = await execFileAsync(bin, args, {
      cwd: options.cwd,
      env: options.env,
      shell: options.shell,
    });
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const err = error as {
      code?: number | string;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    const numeric =
      typeof err.code === "number"
        ? err.code
        : err.code === "ENOENT"
          ? 127
          : 1;
    return {
      code: numeric,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
    };
  }
};

const readIdentityConfigFromDisk = (cwd: string): { photo?: string; audio?: string } => {
  const configPath = path.join(cwd, IDENTITY_CONFIG_REL);
  if (!existsSync(configPath)) {
    return {
      photo: DEFAULT_HOTSPOT_PHOTO_REL,
      audio: DEFAULT_HOTSPOT_AUDIO_REL,
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(configPath, "utf8")) as {
      photo?: string;
      audio?: string;
    };
    return {
      photo: parsed.photo?.trim() || DEFAULT_HOTSPOT_PHOTO_REL,
      audio: parsed.audio?.trim() || DEFAULT_HOTSPOT_AUDIO_REL,
    };
  } catch {
    return {
      photo: DEFAULT_HOTSPOT_PHOTO_REL,
      audio: DEFAULT_HOTSPOT_AUDIO_REL,
    };
  }
};

export const createDefaultSetupDeps = (input: {
  cwd?: string;
  applyFixes?: boolean;
  env?: NodeJS.ProcessEnv;
  dreaminaOptions?: DreaminaCliOptions;
}): MachineSetupDeps => {
  const cwd = input.cwd ?? process.cwd();
  const env = input.env ?? process.env;
  const dreaminaOptions = input.dreaminaOptions ?? { cwd, env };
  return {
    applyFixes: input.applyFixes ?? true,
    cwd,
    env,
    exists: existsSync,
    copyFile: copyFileSync,
    platform: process.platform,
    nodeVersion: process.version,
    which: whichOnPath,
    npmInstall: () => spawnCommand("npm", ["install"], { cwd, env }),
    brewInstall: (pkg) => spawnCommand("brew", ["install", pkg], { cwd, env }),
    installDreaminaCli: () =>
      spawnCommand("bash", ["-lc", DREAMINA_CLI_INSTALL], { cwd, env }),
    dreaminaHelp: async () => {
      try {
        await assertDreaminaAvailable(dreaminaOptions);
        return { code: 0, stdout: "", stderr: "" };
      } catch (error) {
        return {
          code: 1,
          stdout: "",
          stderr: error instanceof Error ? error.message : String(error),
        };
      }
    },
    dreaminaCredit: () => dreaminaUserCredit(dreaminaOptions),
    readIdentityConfig: () => readIdentityConfigFromDisk(cwd),
  };
};

const pushAction = (actions: string[], message: string): void => {
  if (!actions.includes(message)) {
    actions.push(message);
  }
};

const ensureBinary = async (input: {
  bin: string;
  brewPackage: string;
  blockerId: string;
  ask: string;
  deps: MachineSetupDeps;
  agentActions: string[];
  humanBlockers: HumanBlocker[];
}): Promise<boolean> => {
  if (input.deps.which(input.bin)) {
    return true;
  }
  if (input.deps.applyFixes && input.deps.which("brew")) {
    pushAction(
      input.agentActions,
      `Installing ${input.brewPackage} with Homebrew.`,
    );
    const result = await input.deps.brewInstall(input.brewPackage);
    if (result.code === 0 || input.deps.which(input.bin)) {
      pushAction(input.agentActions, `${input.bin} is available.`);
      return true;
    }
    pushAction(
      input.agentActions,
      `Homebrew install of ${input.brewPackage} failed; do not ask the user to type brew commands.`,
    );
  }
  input.humanBlockers.push({
    id: input.blockerId,
    ask: input.ask,
  });
  return false;
};

export const runMachineSetup = async (
  deps: MachineSetupDeps,
): Promise<MachineSetupReport> => {
  const agentActions: string[] = [];
  const humanBlockers: HumanBlocker[] = [];

  if (deps.platform === "win32") {
    return {
      status: "failed",
      agent_actions: ["First-run setup does not support Windows yet."],
      human_blockers: [
        {
          id: "windows_unsupported",
          ask: "当前开箱流程只支持 Mac。请在 Mac 上打开这个文件夹，再交给 Agent。",
        },
      ],
      next_prompt: "Windows is unsupported for first-run setup. Stop; do not fake success.",
    };
  }

  const nodeMajor = parseNodeMajor(deps.nodeVersion);
  if (nodeMajor === undefined || nodeMajor < MIN_NODE_MAJOR) {
    const installed = await ensureBinary({
      bin: "node",
      brewPackage: "node",
      blockerId: "node",
      ask: "这台电脑的 Node.js 还不够新（需要 20 或以上）。请让会装软件的人装好 Node，或允许 Agent 用 Homebrew 安装。装好后对 Agent 说「继续」。",
      deps,
      agentActions,
      humanBlockers,
    });
    if (installed && (parseNodeMajor(deps.nodeVersion) ?? 0) < MIN_NODE_MAJOR) {
      humanBlockers.push({
        id: "node",
        ask: "Node.js 需要 20 或以上。请允许 Agent 升级 Node，或请会装软件的人帮忙。装好后对 Agent 说「继续」。",
      });
    }
  }

  await ensureBinary({
    bin: "ffmpeg",
    brewPackage: "ffmpeg",
    blockerId: "ffmpeg",
    ask: "这台电脑还没有 FFmpeg。请允许 Agent 安装，或请会装软件的人帮忙装好。装好后对 Agent 说「继续」。",
    deps,
    agentActions,
    humanBlockers,
  });
  await ensureBinary({
    bin: "ffprobe",
    brewPackage: "ffmpeg",
    blockerId: "ffprobe",
    ask: "这台电脑还没有 ffprobe（一般随 FFmpeg 一起安装）。请允许 Agent 安装 FFmpeg，或请会装软件的人帮忙。装好后对 Agent 说「继续」。",
    deps,
    agentActions,
    humanBlockers,
  });

  const remotionDir = path.join(deps.cwd, "node_modules", "remotion");
  if (!deps.exists(remotionDir)) {
    if (deps.applyFixes) {
      pushAction(agentActions, "Running npm install.");
      const result = await deps.npmInstall();
      if (result.code !== 0 && !deps.exists(remotionDir)) {
        return {
          status: "failed",
          agent_actions: agentActions,
          human_blockers: [
            {
              id: "npm_install",
              ask: "项目依赖没装上。请允许 Agent 再试一次联网安装，不要自己敲命令。",
            },
          ],
          next_prompt:
            "npm install failed. Retry yourself; do not hand npm commands to the user.",
        };
      }
    } else {
      humanBlockers.push({
        id: "npm_install",
        ask: "项目依赖还没安装。请让 Agent 联网执行安装，不要自己敲命令。",
      });
    }
  }

  const envExample = path.join(deps.cwd, ENV_EXAMPLE_REL);
  const envLocal = path.join(deps.cwd, ENV_LOCAL_REL);
  if (!deps.exists(envLocal)) {
    if (!deps.exists(envExample)) {
      return {
        status: "failed",
        agent_actions: agentActions,
        human_blockers: [
          {
            id: "env_example_missing",
            ask: "仓库里缺少环境模板文件。请换一份完整的项目拷贝后再交给 Agent。",
          },
        ],
        next_prompt: "config/.env.local.example is missing. Stop.",
      };
    }
    if (deps.applyFixes) {
      deps.copyFile(envExample, envLocal);
      pushAction(
        agentActions,
        "Copied config/.env.local.example to .env.local (no overwrite of existing secrets).",
      );
    } else {
      humanBlockers.push({
        id: "env_local",
        ask: "本机还没有 .env.local。请让 Agent 从模板复制一份，不要自己新建。",
      });
    }
  }

  const runtime = loadRuntimeConfig({
    env: {
      ...deps.env,
      AI_REMOTION_ENV_FILE: deps.exists(envLocal) ? envLocal : deps.env.AI_REMOTION_ENV_FILE,
    },
  });
  if (runtime.llm.provider === "openai-compatible" && !runtime.llm.apiKey) {
    humanBlockers.push({
      id: "llm_api_key",
      ask: "请把 DeepSeek（或兼容接口）的 API 密钥发给我。我会只写进这台电脑的 .env.local，不会提交到 git，也不会读出来给你核对。",
    });
  }

  let dreaminaOk = false;
  const help = await deps.dreaminaHelp();
  if (help.code !== 0) {
    if (deps.applyFixes) {
      pushAction(agentActions, "Installing the Dreamina CLI.");
      const installed = await deps.installDreaminaCli();
      const retry = installed.code === 0 ? await deps.dreaminaHelp() : installed;
      if (retry.code === 0) {
        dreaminaOk = true;
        pushAction(agentActions, "Dreamina CLI is available.");
      } else {
        humanBlockers.push({
          id: "dreamina_install",
          ask: "即梦命令行还没装好。请允许 Agent 联网安装；装好后对 Agent 说「继续」。",
        });
      }
    } else {
      humanBlockers.push({
        id: "dreamina_install",
        ask: "即梦命令行还没装好。请允许 Agent 联网安装；装好后对 Agent 说「继续」。",
      });
    }
  } else {
    dreaminaOk = true;
  }

  if (dreaminaOk) {
    const credit = await deps.dreaminaCredit();
    if (isDreaminaLoginRequired(credit) || credit.code !== 0) {
      humanBlockers.push({
        id: "dreamina_login",
        ask: "请在本机完成即梦登录（一般会弹出二维码或浏览器）。登录成功后对 Agent 说「继续」，不要自己敲命令。",
      });
    } else {
      const credits = parseDreaminaCreditCount(credit.stdout);
      if (credits === 0) {
        humanBlockers.push({
          id: "dreamina_credits",
          ask: "即梦账号已登录，但积分是 0。请先在即梦里充值或领取积分，然后对 Agent 说「继续」。",
        });
      } else {
        pushAction(agentActions, "Dreamina CLI is logged in.");
      }
    }
  }

  const identity = deps.readIdentityConfig();
  const photoRel = identity.photo ?? DEFAULT_HOTSPOT_PHOTO_REL;
  const audioRel = identity.audio ?? DEFAULT_HOTSPOT_AUDIO_REL;
  const photoPath = path.isAbsolute(photoRel)
    ? photoRel
    : path.join(deps.cwd, photoRel);
  const audioPath = path.isAbsolute(audioRel)
    ? audioRel
    : path.join(deps.cwd, audioRel);
  if (!deps.exists(photoPath) || !deps.exists(audioPath)) {
    humanBlockers.push({
      id: "identity_files",
      ask: "默认数字人形象文件缺失。请把授权过的人脸照片和音色音频放回项目后，对 Agent 说「继续」。",
    });
  }

  if (humanBlockers.length > 0) {
    return {
      status: "needs_human",
      agent_actions: agentActions,
      human_blockers: humanBlockers,
      next_prompt:
        "Ask the human only the human_blockers.ask lines, in plain language. Do not dump brew, npm, FLAG_, or curl commands. After they reply, run npm run setup again.",
    };
  }

  return {
    status: "ready",
    agent_actions: agentActions,
    human_blockers: [],
    next_prompt:
      "Environment is ready. Ask what video they want. For a hotspot digital-human, follow docs/VIDEO_HOTSPOT.md. Do not ask them to run npm or FLAG_ commands. npm run setup does not replace make check.",
  };
};
