import { readFileSync } from "node:fs";
import path from "node:path";
import { createVideoIntakeDecision } from "../schemas/videoIntake";

const getRequestPath = (args: string[]): string => {
  const index = args.indexOf("--request");
  const value = index >= 0 ? args[index + 1] : undefined;

  if (!value) {
    throw new Error("Usage: npm run video:intake -- --request <request.json>");
  }

  return path.resolve(value);
};

const main = (): void => {
  const requestPath = getRequestPath(process.argv.slice(2));
  const request = JSON.parse(readFileSync(requestPath, "utf8")) as unknown;
  console.log(JSON.stringify(createVideoIntakeDecision(request), null, 2));
};

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
