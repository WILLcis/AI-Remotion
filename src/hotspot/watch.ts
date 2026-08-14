import { FLAGS } from "../../flags/feature-flags";
import type { HotspotResult } from "../schemas/hotspot";
import {
  runDueScheduledHotspot,
  type HotspotFlagCheck,
  type HotspotGenerateVideo,
  type HotspotPublishVideo,
  type SearchHotspotItems,
} from "./runHotspot";
import type { PolishHotspotPack } from "./polishCopy";

export const DEFAULT_HOTSPOT_WATCH_POLL_MS = 60_000;

export type WatchHotspotOptions = {
  isEnabled: HotspotFlagCheck;
  scheduleDir: string;
  outDir: string;
  packOnly?: boolean;
  searchItems: SearchHotspotItems;
  polishPack?: PolishHotspotPack;
  generateVideo?: HotspotGenerateVideo;
  publishVideo?: HotspotPublishVideo;
  pollMs?: number;
  sleep?: (ms: number) => Promise<void>;
  shouldContinue?: () => boolean;
  now?: () => Date;
  onTick?: (results: HotspotResult[]) => void;
};

export const watchHotspot = async (
  options: WatchHotspotOptions,
): Promise<void> => {
  if (!(await options.isEnabled(FLAGS.VIDEO_HOTSPOT))) {
    throw new Error(
      'Hotspot digest is disabled. Set FLAG_video_hotspot=\'{"enabled":true}\' for an internal run.',
    );
  }
  if (!(await options.isEnabled(FLAGS.VIDEO_HOTSPOT_CRAWLER))) {
    throw new Error(
      'Hotspot crawler is disabled. Set FLAG_video_hotspot_crawler=\'{"enabled":true}\' to keep RSS crawl resident.',
    );
  }

  const sleep =
    options.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const shouldContinue = options.shouldContinue ?? (() => true);
  const pollMs = options.pollMs ?? DEFAULT_HOTSPOT_WATCH_POLL_MS;

  while (shouldContinue()) {
    const results = await runDueScheduledHotspot({
      isEnabled: options.isEnabled,
      outDir: options.outDir,
      packOnly: options.packOnly,
      scheduleDir: options.scheduleDir,
      searchItems: options.searchItems,
      polishPack: options.polishPack,
      generateVideo: options.generateVideo,
      publishVideo: options.publishVideo,
      now: options.now?.(),
    });
    options.onTick?.(results);
    if (!shouldContinue()) {
      break;
    }
    await sleep(pollMs);
  }
};
