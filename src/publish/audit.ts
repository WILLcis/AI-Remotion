import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { PublishResult } from "./schema";

export const writePublishAudit = (
  result: PublishResult,
  auditPath: string,
): void => {
  mkdirSync(path.dirname(auditPath), { recursive: true });
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    platform: result.platform,
    video_path: result.video_path,
    video_sha256: result.video_sha256,
    account_alias: result.account_alias,
    title: result.title,
    result: result.status,
    platform_post_id: result.platform_post_id,
    schedule_at: result.schedule_at,
    pack_path: result.pack_path,
    error_code: result.error_code,
  });
  if (/token|secret|cookie|access_token/i.test(line)) {
    throw new Error("Publish audit refused to write a line that looks like a secret.");
  }
  appendFileSync(auditPath, `${line}\n`, "utf8");
};
