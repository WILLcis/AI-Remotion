import path from "node:path";
import { flags, FLAGS, type FlagKey } from "../../flags/feature-flags";
import { runDueScheduledPublish, runPublish } from "../publish/runPublish";
import { resolvePublishPlatforms } from "../publish/schema";

const usage = `Usage:
  npm run video:publish -- --platform <douyin|weixin-channels|xiaohongshu|all> --video <mp4> --title <text> --i-approve-publish [--cover <image>] [--schedule-at <ISO-8601>] [--caption <text>] [--topic <tag>] [--audit <jsonl>] [--schedule-dir <dir>] [--pack-dir <dir>]
  npm run video:publish -- --due --i-approve-publish [--schedule-dir <dir>] [--audit <jsonl>]

Dreamina autopilot: --generation-service dreamina skips --i-approve-publish (selecting dreamina is publish consent).
Douyin official create_video has no native schedule field. --schedule-at queues locally; --due submits jobs whose time has passed.
Weixin Channels / Xiaohongshu write an assisted publish pack only (no RPA).
Douyin live API is paused unless FLAG_video_publish_douyin is on; --platform all then skips Douyin.
`;

const getFlagValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const getFlagValues = (args: string[], name: string): string[] => {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === name && args[index + 1]) {
      values.push(args[index + 1]!);
    }
  }
  return values;
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("-h") || args.includes("--help")) {
    console.log(usage.trim());
    return;
  }

  const dreaminaAutopilot =
    getFlagValue(args, "--generation-service") === "dreamina";
  if (!args.includes("--i-approve-publish") && !dreaminaAutopilot) {
    throw new Error(
      "Refusing to publish without --i-approve-publish (current-session human approval).",
    );
  }

  const cwd = process.cwd();
  const auditPath = path.resolve(
    getFlagValue(args, "--audit") ?? path.join(cwd, "state/publish/audit.jsonl"),
  );
  const scheduleDir = path.resolve(
    getFlagValue(args, "--schedule-dir") ??
      path.join(cwd, "state/publish/scheduled"),
  );
  const packDir = getFlagValue(args, "--pack-dir");
  const isEnabled = (key: FlagKey) =>
    flags.isEnabled(key, { isTeamMember: true });

  if (args.includes("--due")) {
    const results = await runDueScheduledPublish({
      auditPath,
      isEnabled,
      scheduleDir,
    });
    console.log(JSON.stringify({ results }, null, 2));
    if (results.some((result) => result.status === "failed" || result.status === "blocked")) {
      process.exitCode = 1;
    }
    return;
  }

  const platformRaw = getFlagValue(args, "--platform");
  const video = getFlagValue(args, "--video");
  const title = getFlagValue(args, "--title");
  if (!platformRaw || !video || !title) {
    throw new Error(usage);
  }
  const platforms = resolvePublishPlatforms(platformRaw, {
    skipDouyin:
      platformRaw === "all" &&
      (await isEnabled(FLAGS.VIDEO_PUBLISH)) &&
      !(await isEnabled(FLAGS.VIDEO_PUBLISH_DOUYIN)),
  });
  const results = [];
  for (const platform of platforms) {
    results.push(
      await runPublish(
        {
          platform,
          video_path: path.resolve(video),
          title,
          caption: getFlagValue(args, "--caption"),
          cover_path: getFlagValue(args, "--cover"),
          topics: getFlagValues(args, "--topic"),
          account_alias: getFlagValue(args, "--account") ?? "default",
          schedule_at: getFlagValue(args, "--schedule-at") ?? null,
          approve_publish: true,
        },
        {
          auditPath,
          isEnabled,
          packDir: packDir ? path.resolve(packDir) : undefined,
          scheduleDir,
        },
      ),
    );
  }
  console.log(
    JSON.stringify(results.length === 1 ? results[0] : { results }, null, 2),
  );
  if (
    results.some(
      (result) => result.status === "blocked" || result.status === "failed",
    )
  ) {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
