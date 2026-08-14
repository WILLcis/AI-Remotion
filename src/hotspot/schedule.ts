import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { hotspotRequestSchema, type HotspotRequest } from "../schemas/hotspot";

export type ScheduledHotspotJob = {
  id: string;
  request: HotspotRequest;
  created_at: string;
  last_run_date: string | null;
};

const fileFor = (dir: string, id: string): string => path.join(dir, `${id}.json`);

export const shanghaiDate = (now: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const shanghaiMinutes = (now: Date): number => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
};

export const isHotspotJobDue = (
  job: ScheduledHotspotJob,
  now = new Date(),
): boolean => {
  if (job.request.repeat === "daily") {
    const time = job.request.daily_time ?? "08:00";
    const [hours, minutes] = time.split(":").map(Number);
    const dueMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
    if (shanghaiMinutes(now) < dueMinutes) {
      return false;
    }
    return job.last_run_date !== shanghaiDate(now);
  }
  const at = job.request.schedule_at;
  return Boolean(at && Date.parse(at) <= now.getTime());
};

export const enqueueScheduledHotspot = (
  dir: string,
  request: HotspotRequest,
  id: string,
  now = new Date(),
): string => {
  mkdirSync(dir, { recursive: true });
  const job: ScheduledHotspotJob = {
    id,
    request,
    created_at: now.toISOString(),
    last_run_date: null,
  };
  const filePath = fileFor(dir, id);
  writeFileSync(filePath, `${JSON.stringify(job, null, 2)}\n`, "utf8");
  return filePath;
};

export const listScheduledHotspot = (dir: string): ScheduledHotspotJob[] => {
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const raw = JSON.parse(readFileSync(path.join(dir, name), "utf8")) as unknown;
      const record = raw as ScheduledHotspotJob;
      return {
        ...record,
        request: hotspotRequestSchema.parse(record.request),
      };
    });
};

export const listDueScheduledHotspot = (
  dir: string,
  now = new Date(),
): ScheduledHotspotJob[] =>
  listScheduledHotspot(dir).filter((job) => isHotspotJobDue(job, now));

export const markScheduledHotspotDone = (
  dir: string,
  job: ScheduledHotspotJob,
  now = new Date(),
): void => {
  if (job.request.repeat === "daily") {
    const next: ScheduledHotspotJob = {
      ...job,
      last_run_date: shanghaiDate(now),
    };
    writeFileSync(fileFor(dir, job.id), `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return;
  }
  mkdirSync(path.join(dir, "done"), { recursive: true });
  renameSync(fileFor(dir, job.id), path.join(dir, "done", `${job.id}.json`));
};
