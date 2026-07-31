import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { flags, FLAGS } from "../../flags/feature-flags";
import { routeVideoJob } from "../agent/videoRouter";

const getJobPath = (args: string[]): string => {
  const index = args.indexOf("--job");
  const value = index >= 0 ? args[index + 1] : undefined;

  if (!value) {
    throw new Error("Usage: npm run video:route -- --job <job.yaml|job.json>");
  }

  return path.resolve(value);
};

const parseJobFile = (filePath: string): unknown => {
  const source = readFileSync(filePath, "utf8");
  return path.extname(filePath).toLowerCase() === ".json"
    ? JSON.parse(source)
    : YAML.parse(source);
};

const main = async (): Promise<void> => {
  const jobPath = getJobPath(process.argv.slice(2));
  const enabled = await flags.isEnabled(FLAGS.VIDEO_AGENT_PLATFORM);
  const route = routeVideoJob(parseJobFile(jobPath), { enabled });
  console.log(JSON.stringify(route, null, 2));
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
