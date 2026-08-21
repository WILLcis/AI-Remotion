import path from "node:path";
import { flags, FLAGS } from "../../flags/feature-flags";
import { buildTalkingHeadClip } from "../hotspot/composeCopy";
import { generateDigitalHumanClip } from "../hotspot/generateClip";
import { resolveHotspotIdentity } from "../hotspot/identity";
import {
  assertRequestedDreaminaAccount,
  DEFAULT_DREAMINA_ACCOUNT_ALIAS,
  loadDreaminaAccounts,
  loginDreaminaAccount,
  logoutDreaminaAccount,
  readDreaminaAccountStatus,
} from "../media/dreaminaAccounts";
import {
  assertDreaminaAvailable,
  DEFAULT_DREAMINA_VIDEO_MODEL,
  dreaminaImage2Video,
  dreaminaMultimodal2Video,
  dreaminaQueryResult,
  dreaminaText2Image,
  dreaminaText2Video,
  dreaminaUserCredit,
  parseDreaminaCreditCount,
  parseDreaminaSubmitId,
  parseDreaminaUserId,
  resolveDreaminaBin,
} from "../media/dreaminaCli";

const usage = `Usage:
  npm run media:dreamina -- check
  npm run media:dreamina -- accounts
  npm run media:dreamina -- whoami
  npm run media:dreamina -- login --account <alias>
  npm run media:dreamina -- logout
  npm run media:dreamina -- switch --account <alias>
  npm run media:dreamina -- credit
  npm run media:dreamina -- talking-head --spoken <text> --out <dir> --generation-service dreamina [--account <alias>]
  npm run media:dreamina -- text2image --prompt <text> --out <dir> --i-approve-paid
  npm run media:dreamina -- image2video --image <path> --out <dir> --i-approve-paid [--prompt <text>]
  npm run media:dreamina -- multimodal2video --image <path> --audio <path> --out <dir> --i-approve-paid [--prompt <text>]
  npm run media:dreamina -- text2video --prompt <text> --out <dir> --i-approve-paid [--duration 5] [--ratio 9:16] [--model_version seedance2.0mini]

Talking-head / 口播 always builds a Dreamina cover still, then multimodal2video with that cover as @Image 1. Do not use text2video for 我的形象.

Only one Dreamina login is active at a time. Switch accounts with login/logout/switch; do not use dreamina session for user accounts.

Job path: --generation-service dreamina skips --i-approve-paid (selecting dreamina is paid-generation consent).
`;

const getFlagValue = (args: string[], name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const hasFlag = (args: string[], name: string): boolean => args.includes(name);

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === "-h" || command === "--help") {
    console.log(usage.trim());
    return;
  }

  const enabled = await flags.isEnabled(FLAGS.DREAMINA_MEDIA, {
    isTeamMember: true,
  });
  if (!enabled) {
    throw new Error(
      'Dreamina media is disabled. Set FLAG_dreamina_media=\'{"enabled":true}\' for an approved internal run.',
    );
  }

  if (command === "check") {
    await assertDreaminaAvailable();
    console.log(
      JSON.stringify(
        {
          ok: true,
          bin: resolveDreaminaBin(),
          next: "npm run media:dreamina -- login --account default",
        },
        null,
        2,
      ),
    );
    return;
  }

  if (command === "accounts") {
    await assertDreaminaAvailable();
    const status = await readDreaminaAccountStatus({});
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (command === "whoami") {
    await assertDreaminaAvailable();
    const status = await readDreaminaAccountStatus({});
    console.log(JSON.stringify(status, null, 2));
    if (!status.logged_in) {
      process.exitCode = 1;
    }
    return;
  }

  if (command === "login") {
    await assertDreaminaAvailable();
    const alias =
      getFlagValue(args, "--account") ?? DEFAULT_DREAMINA_ACCOUNT_ALIAS;
    const result = await loginDreaminaAccount({ alias });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "switch") {
    await assertDreaminaAvailable();
    const alias = getFlagValue(args, "--account");
    if (!alias) {
      throw new Error(usage);
    }
    const result = await loginDreaminaAccount({ alias });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "logout") {
    await assertDreaminaAvailable();
    const result = await logoutDreaminaAccount({});
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === "credit") {
    await assertDreaminaAvailable();
    const result = await dreaminaUserCredit();
    process.stdout.write(result.stdout);
    if (result.stdout && !result.stdout.endsWith("\n")) {
      process.stdout.write("\n");
    }
    if (result.stderr.trim()) {
      process.stderr.write(result.stderr);
    }
    const store = loadDreaminaAccounts();
    console.log(
      JSON.stringify(
        {
          account: store.current,
          user_id: parseDreaminaUserId(result.stdout),
          credit: parseDreaminaCreditCount(result.stdout),
        },
        null,
        2,
      ),
    );
    if (result.code !== 0) {
      process.exitCode = result.code ?? 1;
    }
    return;
  }

  const approvePaid =
    hasFlag(args, "--i-approve-paid") ||
    getFlagValue(args, "--generation-service") === "dreamina";
  const out = getFlagValue(args, "--out");
  if (!out) {
    throw new Error(usage);
  }
  const downloadDir = path.resolve(out);
  assertRequestedDreaminaAccount(getFlagValue(args, "--account"), loadDreaminaAccounts());

  if (command === "talking-head") {
    const spoken = getFlagValue(args, "--spoken");
    if (!spoken) {
      throw new Error(usage);
    }
    const identity = resolveHotspotIdentity({
      photoPath: getFlagValue(args, "--photo"),
      audioPath: getFlagValue(args, "--audio"),
      audioTranscript: getFlagValue(args, "--audio-transcript"),
      applyDefault: true,
    });
    if (!identity.photo_path || !identity.audio_path) {
      throw new Error(
        "talking-head needs the default hotspot identity (dh1.jpg + dg1.wav) or --photo and --audio together.",
      );
    }
    const clip = buildTalkingHeadClip({
      spoken,
      headline: getFlagValue(args, "--headline"),
      cover: getFlagValue(args, "--cover"),
      coverKeyword: getFlagValue(args, "--cover-keyword"),
      tags: getFlagValue(args, "--tags"),
    });
    const generated = await generateDigitalHumanClip({
      clip,
      downloadDir,
      approvePaid,
      photoPath: identity.photo_path,
      audioPath: identity.audio_path,
      audioTranscript: identity.audio_transcript,
      modelVersion: getFlagValue(args, "--model_version") ?? DEFAULT_DREAMINA_VIDEO_MODEL,
    });
    console.log(JSON.stringify({ ok: true, clip, ...generated }, null, 2));
    return;
  }

  if (command === "text2image") {
    const prompt = getFlagValue(args, "--prompt");
    if (!prompt) {
      throw new Error(usage);
    }
    const result = await dreaminaText2Image({
      approvePaid,
      downloadDir,
      prompt,
      pollSeconds: Number(getFlagValue(args, "--poll") ?? "60"),
      ratio: getFlagValue(args, "--ratio"),
      resolutionType: getFlagValue(args, "--resolution_type"),
    });
    process.stdout.write(result.stdout);
    if (result.stderr.trim()) {
      process.stderr.write(result.stderr);
    }
    const submitId = parseDreaminaSubmitId(result.stdout);
    if (submitId) {
      const downloaded = await dreaminaQueryResult({
        submitId,
        downloadDir,
      });
      process.stdout.write(downloaded.stdout);
      if (downloaded.stderr.trim()) {
        process.stderr.write(downloaded.stderr);
      }
      if (downloaded.code !== 0) {
        process.exitCode = downloaded.code ?? 1;
        return;
      }
    }
    if (result.code !== 0) {
      process.exitCode = result.code ?? 1;
    }
    return;
  }

  if (command === "image2video") {
    const image = getFlagValue(args, "--image");
    if (!image) {
      throw new Error(usage);
    }
    const result = await dreaminaImage2Video({
      approvePaid,
      downloadDir,
      imagePath: path.resolve(image),
      pollSeconds: Number(getFlagValue(args, "--poll") ?? "120"),
      prompt: getFlagValue(args, "--prompt"),
      modelVersion: getFlagValue(args, "--model_version") ?? DEFAULT_DREAMINA_VIDEO_MODEL,
    });
    process.stdout.write(result.stdout);
    if (result.stderr.trim()) {
      process.stderr.write(result.stderr);
    }
    const submitId = parseDreaminaSubmitId(result.stdout);
    if (submitId) {
      const downloaded = await dreaminaQueryResult({
        submitId,
        downloadDir,
      });
      process.stdout.write(downloaded.stdout);
      if (downloaded.stderr.trim()) {
        process.stderr.write(downloaded.stderr);
      }
      if (downloaded.code !== 0) {
        process.exitCode = downloaded.code ?? 1;
        return;
      }
    }
    if (result.code !== 0) {
      process.exitCode = result.code ?? 1;
    }
    return;
  }

  if (command === "multimodal2video") {
    const image = getFlagValue(args, "--image");
    const audio = getFlagValue(args, "--audio");
    if (!image || !audio) {
      throw new Error(usage);
    }
    const result = await dreaminaMultimodal2Video({
      approvePaid,
      imagePaths: [path.resolve(image)],
      audioPaths: [path.resolve(audio)],
      pollSeconds: Number(getFlagValue(args, "--poll") ?? "180"),
      prompt: getFlagValue(args, "--prompt"),
      durationSeconds: Number(getFlagValue(args, "--duration") ?? "5"),
      ratio: getFlagValue(args, "--ratio") ?? "9:16",
      videoResolution: getFlagValue(args, "--video_resolution") ?? "720p",
      modelVersion: getFlagValue(args, "--model_version") ?? DEFAULT_DREAMINA_VIDEO_MODEL,
    });
    process.stdout.write(result.stdout);
    if (result.stderr.trim()) {
      process.stderr.write(result.stderr);
    }
    const submitId = parseDreaminaSubmitId(result.stdout);
    if (submitId) {
      const downloaded = await dreaminaQueryResult({
        submitId,
        downloadDir,
      });
      process.stdout.write(downloaded.stdout);
      if (downloaded.stderr.trim()) {
        process.stderr.write(downloaded.stderr);
      }
      if (downloaded.code !== 0) {
        process.exitCode = downloaded.code ?? 1;
        return;
      }
    }
    if (result.code !== 0) {
      process.exitCode = result.code ?? 1;
    }
    return;
  }

  if (command === "text2video") {
    const prompt = getFlagValue(args, "--prompt");
    if (!prompt) {
      throw new Error(usage);
    }
    const result = await dreaminaText2Video({
      approvePaid,
      prompt,
      durationSeconds: Number(getFlagValue(args, "--duration") ?? "5"),
      pollSeconds: Number(getFlagValue(args, "--poll") ?? "180"),
      ratio: getFlagValue(args, "--ratio") ?? "9:16",
      videoResolution: getFlagValue(args, "--video_resolution") ?? "720p",
      modelVersion: getFlagValue(args, "--model_version") ?? DEFAULT_DREAMINA_VIDEO_MODEL,
    });
    process.stdout.write(result.stdout);
    if (result.stderr.trim()) {
      process.stderr.write(result.stderr);
    }
    const submitId = parseDreaminaSubmitId(result.stdout);
    if (submitId) {
      const downloaded = await dreaminaQueryResult({
        submitId,
        downloadDir,
      });
      process.stdout.write(downloaded.stdout);
      if (downloaded.stderr.trim()) {
        process.stderr.write(downloaded.stderr);
      }
      if (downloaded.code !== 0) {
        process.exitCode = downloaded.code ?? 1;
        return;
      }
    }
    if (result.code !== 0) {
      process.exitCode = result.code ?? 1;
    }
    return;
  }

  throw new Error(usage);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
