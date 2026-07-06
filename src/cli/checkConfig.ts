import {
  getConfigSummary,
  getRuntimeConfigIssues,
  loadRuntimeConfig,
} from "../config/runtimeConfig";

type CliOptions = {
  help: boolean;
  strict: boolean;
};

const main = (): void => {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  const config = loadRuntimeConfig();
  const issues = getRuntimeConfigIssues(config);

  console.log(getConfigSummary(config));

  if (issues.length > 0) {
    console.log("");
    console.log("Config issues:");
    for (const issue of issues) {
      console.log(`- ${issue.severity}: ${issue.code} - ${issue.message}`);
    }
  }

  if (options.strict && issues.some((issue) => issue.severity !== "info")) {
    process.exitCode = 1;
  }
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    help: false,
    strict: false,
  };

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--strict") {
      options.strict = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
};

const printHelp = (): void => {
  console.log(`Check AI-Remotion LLM/TTS runtime configuration.

Usage:
  npm run config:check
  npm run config:check -- --strict

Set AI_REMOTION_ENV_FILE=/path/to/.env to load a local env file explicitly.
`);
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
