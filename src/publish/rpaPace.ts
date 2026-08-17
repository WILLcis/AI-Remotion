export const RPA_DAY_START_HOUR = 10;
export const RPA_DAY_END_HOUR = 20;
export const RPA_MAX_POSTS_PER_DAY = 30;
export const RPA_MIN_GAP_MS = 90 * 60 * 1000;
export const RPA_SAME_CLIP_MIN_GAP_MS = 2 * 60 * 1000;
export const RPA_SAME_CLIP_MAX_GAP_MS = 5 * 60 * 1000;

export type RpaPaceEntry = {
  at: string;
  platform: string;
  video_sha256: string;
  account_alias: string;
};

export type RpaPaceDecision =
  | { ok: true }
  | {
      ok: false;
      code: "rpa_night" | "rpa_daily_cap" | "rpa_too_soon";
      message: string;
      waitMs?: number;
      sameClipOtherPlatform?: boolean;
    };

const startOfLocalDay = (now: Date): Date => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const isRpaDaytime = (now: Date): boolean => {
  const hour = now.getHours();
  return hour >= RPA_DAY_START_HOUR && hour < RPA_DAY_END_HOUR;
};

export const postsOnLocalDay = (entries: RpaPaceEntry[], now: Date): RpaPaceEntry[] => {
  const start = startOfLocalDay(now).getTime();
  const end = start + 24 * 60 * 60 * 1000;
  return entries.filter((entry) => {
    const at = Date.parse(entry.at);
    return Number.isFinite(at) && at >= start && at < end;
  });
};

export const evaluateRpaPace = (input: {
  entries: RpaPaceEntry[];
  now: Date;
  platform: string;
  videoSha256: string;
}): RpaPaceDecision => {
  if (!isRpaDaytime(input.now)) {
    return {
      ok: false,
      code: "rpa_night",
      message: `RPA refuses overnight/batch posting. Post between ${String(RPA_DAY_START_HOUR).padStart(2, "0")}:00 and ${String(RPA_DAY_END_HOUR).padStart(2, "0")}:00 local time.`,
    };
  }
  const today = postsOnLocalDay(input.entries, input.now);
  if (today.length >= RPA_MAX_POSTS_PER_DAY) {
    return {
      ok: false,
      code: "rpa_daily_cap",
      message: `RPA daily cap reached (${RPA_MAX_POSTS_PER_DAY} posts). Wait until tomorrow.`,
    };
  }
  const last = [...input.entries]
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .at(-1);
  if (!last) {
    return { ok: true };
  }
  const elapsed = input.now.getTime() - Date.parse(last.at);
  const sameClipOtherPlatform =
    last.video_sha256 === input.videoSha256 && last.platform !== input.platform;
  const minGap = sameClipOtherPlatform ? RPA_SAME_CLIP_MIN_GAP_MS : RPA_MIN_GAP_MS;
  if (elapsed < minGap) {
    const waitMs = minGap - elapsed;
    const minutes = Math.ceil(waitMs / 60_000);
    return {
      ok: false,
      code: "rpa_too_soon",
      waitMs,
      sameClipOtherPlatform,
      message: sameClipOtherPlatform
        ? `Wait about ${minutes} more minute(s) before RPA on the other platform for the same clip.`
        : `RPA spacing: wait about ${minutes} more minute(s) (min ${Math.round(RPA_MIN_GAP_MS / 60000)} min, max ${RPA_MAX_POSTS_PER_DAY}/day, daytime only).`,
    };
  }
  return { ok: true };
};

export const randomInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));
