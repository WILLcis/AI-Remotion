import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { publishRequestSchema, type PublishRequest } from "./schema";

export type ScheduledPublishJob = {
  id: string;
  request: PublishRequest;
  created_at: string;
};

const fileFor = (dir: string, id: string): string => path.join(dir, `${id}.json`);

export const enqueueScheduledPublish = (
  dir: string,
  request: PublishRequest,
  id: string,
  now = new Date(),
): string => {
  mkdirSync(dir, { recursive: true });
  const job: ScheduledPublishJob = {
    id,
    request,
    created_at: now.toISOString(),
  };
  const filePath = fileFor(dir, id);
  writeFileSync(filePath, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  return filePath;
};

export const listDueScheduledPublish = (
  dir: string,
  now = new Date(),
): ScheduledPublishJob[] => {
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const raw = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as unknown;
      const record = raw as ScheduledPublishJob;
      return {
        ...record,
        request: publishRequestSchema.parse(record.request),
      };
    })
    .filter((job) => {
      const at = job.request.schedule_at;
      return Boolean(at && Date.parse(at) <= now.getTime());
    })
    .sort(
      (left, right) =>
        Date.parse(left.request.schedule_at ?? "") -
        Date.parse(right.request.schedule_at ?? ""),
    );
};

export const markScheduledPublishDone = (dir: string, id: string): void => {
  mkdirSync(path.join(dir, "done"), { recursive: true });
  renameSync(fileFor(dir, id), path.join(dir, "done", `${id}.json`));
};
