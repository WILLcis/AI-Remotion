import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { type RpaPaceEntry } from "./rpaPace";

export const defaultRpaPacePath = (cwd = process.cwd()): string =>
  path.join(cwd, "state/publish/rpa-pace.json");

export const loadRpaPaceEntries = (filePath: string): RpaPaceEntry[] => {
  if (!existsSync(filePath)) {
    return [];
  }
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as {
      entries?: RpaPaceEntry[];
    };
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch {
    return [];
  }
};

export const appendRpaPaceEntry = (
  filePath: string,
  entry: RpaPaceEntry,
): void => {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const entries = [...loadRpaPaceEntries(filePath), entry];
  writeFileSync(
    filePath,
    `${JSON.stringify({ entries }, null, 2)}\n`,
    "utf8",
  );
};
