import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomInt } from "./rpaPace";
import { rpaPageLooksSuccessful } from "./rpaSignals";
import type { PublishPlatform, PublishRequest } from "./schema";

const PLAYWRIGHT_SPECIFIER = "playwright";

export const RPA_CREATOR_URLS: Record<
  Exclude<PublishPlatform, "douyin">,
  string
> = {
  "weixin-channels": "https://channels.weixin.qq.com/platform/post/create",
  xiaohongshu: "https://creator.xiaohongshu.com/publish/publish",
};

export const RPA_CHROME_LAUNCH = {
  channel: "chrome" as const,
  headless: false,
  ignoreDefaultArgs: ["--enable-automation"],
  args: ["--disable-blink-features=AutomationControlled"],
  locale: "zh-CN",
  viewport: { width: 1440, height: 900 },
};

const FILE_INPUTS = ['input[type="file"]'];
const TITLE_INPUTS = [
  'input[placeholder*="标题"]:visible',
  'textarea[placeholder*="标题"]:visible',
];
const CAPTION_INPUTS = [
  'textarea[placeholder*="描述"]:visible',
  'textarea[placeholder*="简介"]:visible',
  'textarea[placeholder*="正文"]:visible',
  'div[contenteditable="true"]:visible',
];
const PUBLISH_BUTTONS = [
  'button:has-text("发表"):visible',
  'button:has-text("发布"):visible',
];
const SKIP_PLACEHOLDER = /商品|合集|链接|活动|标注/;
const SUCCESS_LABELS = [
  "发表成功",
  "发布成功",
  "笔记发布成功",
  "发布完成",
  "已发布",
];
const CONFIRM_LABELS = ["确认发表", "确认发布", "确定发表", "确定发布"];

type RpaLaunchOptions = {
  channel: "chrome";
  headless: boolean;
  ignoreDefaultArgs?: string[];
  args?: string[];
  locale?: string;
  viewport?: { width: number; height: number };
};

export type RpaPublishInput = {
  request: PublishRequest;
  profileDir: string;
  screenshotDir: string;
};

export type RpaPublishOutcome = {
  platform_post_id: string | null;
  message: string;
};

type RpaHandle = {
  click: (options?: { timeout?: number; delay?: number }) => Promise<unknown>;
  fill: (value: string, options?: { timeout?: number }) => Promise<unknown>;
  getAttribute: (name: string) => Promise<string | null>;
  isEnabled?: () => Promise<boolean>;
  isVisible: () => Promise<boolean>;
  pressSequentially?: (
    value: string,
    options?: { delay?: number; timeout?: number },
  ) => Promise<unknown>;
  scrollIntoViewIfNeeded?: () => Promise<unknown>;
  setInputFiles: (files: string | string[]) => Promise<unknown>;
};

type RpaLocator = {
  count: () => Promise<number>;
  first: () => RpaHandle;
  last: () => RpaHandle;
  nth: (index: number) => RpaHandle;
};

type RpaFrame = {
  getByRole: (
    role: string,
    options?: { name?: string | RegExp },
  ) => RpaLocator;
  getByText: (text: string | RegExp, options?: { exact?: boolean }) => RpaLocator;
  locator: (selector: string) => RpaLocator;
};

type RpaPage = RpaFrame & {
  frames: () => RpaFrame[];
  goto: (
    url: string,
    options?: { timeout?: number; waitUntil?: "domcontentloaded" | "load" },
  ) => Promise<unknown>;
  keyboard?: { press: (key: string) => Promise<unknown> };
  screenshot: (options: { path: string }) => Promise<unknown>;
  url: () => string;
  waitForTimeout: (ms: number) => Promise<void>;
};

type RpaContext = {
  close: () => Promise<void>;
  newPage: () => Promise<RpaPage>;
  pages: () => RpaPage[];
};

const loadChrome = async (): Promise<{
  launchPersistentContext: (
    userDataDir: string,
    options: RpaLaunchOptions,
  ) => Promise<RpaContext>;
}> => {
  try {
    const mod = (await import(PLAYWRIGHT_SPECIFIER)) as {
      chromium: {
        launchPersistentContext: (
          userDataDir: string,
          options: RpaLaunchOptions,
        ) => Promise<RpaContext>;
      };
    };
    return mod.chromium;
  } catch {
    throw new Error(
      "Playwright is not installed. After FLAG_video_publish_rpa and --i-accept-rpa-risk, run: npm install playwright && npx playwright install chrome",
    );
  }
};

const humanPause = async (page: RpaPage, minMs: number, maxMs: number): Promise<void> => {
  await page.waitForTimeout(randomInt(minMs, maxMs));
};

const firstUsable = async (
  page: RpaPage,
  selectors: string[],
): Promise<RpaHandle | undefined> => {
  for (const selector of selectors) {
    const locator = page.locator(selector);
    const count = await locator.count();
    for (let index = 0; index < count; index += 1) {
      const handle = locator.nth(index);
      try {
        if (!(await handle.isVisible())) {
          continue;
        }
      } catch {
        continue;
      }
      const placeholder = `${(await handle.getAttribute("placeholder")) ?? ""}`;
      if (SKIP_PLACEHOLDER.test(placeholder)) {
        continue;
      }
      return handle;
    }
  }
  return undefined;
};

const waitForComposer = async (page: RpaPage, timeoutMs: number): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const fileCount = await page.locator(FILE_INPUTS[0]!).count();
    const publish = await findPublish(page);
    if (fileCount > 0 || publish) {
      return;
    }
    await humanPause(page, 1_400, 2_400);
  }
  throw new Error(
    "Creator console did not show an upload control. Complete QR/login in the opened Chrome window, then retry.",
  );
};

const framesOf = (page: RpaPage): RpaFrame[] => {
  try {
    const frames = page.frames();
    return frames.length > 0 ? frames : [page];
  } catch {
    return [page];
  }
};

const findLabeledIn = async (
  root: RpaFrame,
  labels: readonly string[],
): Promise<RpaHandle | undefined> => {
  for (const label of labels) {
    const exact = root.getByText(label, { exact: true });
    const exactCount = await exact.count();
    if (exactCount > 0) {
      return exact.nth(exactCount - 1);
    }
    const byRole = root.getByRole("button", {
      name: new RegExp(`^\\s*${label}\\s*$`),
    });
    if ((await byRole.count()) > 0) {
      return byRole.last();
    }
  }
  return undefined;
};

const findPublishIn = async (root: RpaFrame): Promise<RpaHandle | undefined> => {
  const labeled = await findLabeledIn(root, ["发表", "发布"]);
  if (labeled) {
    return labeled;
  }
  const byRole = root.getByRole("button", { name: /^(发表|发布)$/ });
  if ((await byRole.count()) > 0) {
    return byRole.last();
  }
  return undefined;
};

const findPublish = async (page: RpaPage): Promise<RpaHandle | undefined> => {
  for (const frame of framesOf(page)) {
    const handle = await findPublishIn(frame);
    if (handle) {
      return handle;
    }
  }
  return firstUsable(page, PUBLISH_BUTTONS);
};

const isHandleReady = async (handle: RpaHandle): Promise<boolean> => {
  try {
    if (!(await handle.isVisible())) {
      return false;
    }
  } catch {
    return false;
  }
  if (!handle.isEnabled) {
    return true;
  }
  try {
    return await handle.isEnabled();
  } catch {
    return true;
  }
};

const clickHuman = async (page: RpaPage, handle: RpaHandle): Promise<void> => {
  if (handle.scrollIntoViewIfNeeded) {
    try {
      await handle.scrollIntoViewIfNeeded();
    } catch {
      // Some locators cannot scroll; click may still work.
    }
  }
  await humanPause(page, 400, 1_100);
  await handle.click({ timeout: 15_000, delay: randomInt(60, 180) });
};

const typeHuman = async (
  page: RpaPage,
  handle: RpaHandle,
  value: string,
): Promise<void> => {
  await clickHuman(page, handle);
  if (page.keyboard) {
    try {
      await page.keyboard.press(
        process.platform === "darwin" ? "Meta+A" : "Control+A",
      );
    } catch {
      // Select-all is best-effort before typing.
    }
  }
  if (handle.pressSequentially) {
    await handle.pressSequentially(value, {
      delay: randomInt(55, 130),
      timeout: 30_000,
    });
    return;
  }
  await handle.fill(value, { timeout: 10_000 });
};

const fillIfPresent = async (
  page: RpaPage,
  selectors: string[],
  value: string | undefined,
): Promise<void> => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return;
  }
  const handle = await firstUsable(page, selectors);
  if (!handle) {
    return;
  }
  await typeHuman(page, handle, trimmed);
};

const collectSuccessText = async (page: RpaPage): Promise<string> => {
  const found: string[] = [];
  for (const frame of framesOf(page)) {
    for (const label of SUCCESS_LABELS) {
      try {
        if ((await frame.getByText(label).count()) > 0) {
          found.push(label);
        }
      } catch {
        // Frame may have navigated.
      }
    }
  }
  return found.join("\n");
};

const clickConfirmIfPresent = async (page: RpaPage): Promise<void> => {
  await humanPause(page, 700, 1_600);
  for (const frame of framesOf(page)) {
    const handle = await findLabeledIn(frame, CONFIRM_LABELS);
    if (!handle) {
      continue;
    }
    try {
      if (await isHandleReady(handle)) {
        await clickHuman(page, handle);
        return;
      }
    } catch {
      // Dialog may already have closed.
    }
  }
};

const waitUntilPublishReady = async (page: RpaPage): Promise<RpaHandle> => {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const handle = await findPublish(page);
    if (handle && (await isHandleReady(handle))) {
      return handle;
    }
    await humanPause(page, 1_600, 2_800);
  }
  throw new Error(
    "Upload/processing did not finish: 发表/发布 stayed unavailable. Do not treat this as posted.",
  );
};

const waitForPublishSuccess = async (page: RpaPage): Promise<void> => {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (rpaPageLooksSuccessful(page.url(), await collectSuccessText(page))) {
      return;
    }
    await humanPause(page, 1_200, 2_200);
  }
  throw new Error(
    "Clicked 发表/发布 but the page never confirmed success. The draft may have been discarded if the browser closed too early. Use the pack to finish by hand.",
  );
};

const launchChromeProfile = async (profileDir: string): Promise<RpaContext> => {
  const chrome = await loadChrome();
  try {
    return await chrome.launchPersistentContext(profileDir, RPA_CHROME_LAUNCH);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to open Google Chrome with a persistent profile (not Incognito, not Playwright Chromium). Quit any Chrome window using ${profileDir}, install Chrome if needed (npx playwright install chrome), then retry. ${detail}`,
    );
  }
};

export const playwrightRpaPublish = async (
  input: RpaPublishInput,
): Promise<RpaPublishOutcome> => {
  if (input.request.platform === "douyin") {
    throw new Error("Douyin publish uses the official API, not browser RPA.");
  }
  mkdirSync(input.profileDir, { recursive: true });
  mkdirSync(input.screenshotDir, { recursive: true });
  const context = await launchChromeProfile(input.profileDir);
  const page = context.pages()[0] ?? (await context.newPage());
  const screenshotPath = path.join(
    input.screenshotDir,
    `rpa-failed-${input.request.platform}.png`,
  );
  try {
    await humanPause(page, 800, 1_800);
    await page.goto(RPA_CREATOR_URLS[input.request.platform], {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await waitForComposer(page, 300_000);
    await humanPause(page, 1_200, 2_500);
    const fileInputs = page.locator(FILE_INPUTS[0]!);
    const fileCount = await fileInputs.count();
    if (fileCount > 0) {
      await fileInputs.nth(0).setInputFiles(input.request.video_path);
      await humanPause(page, 12_000, 22_000);
      if (input.request.cover_path && fileCount > 1) {
        try {
          await fileInputs.nth(1).setInputFiles(input.request.cover_path);
          await humanPause(page, 1_500, 3_000);
        } catch {
          // Cover is optional; video upload is required.
        }
      }
    }
    await waitUntilPublishReady(page);
    await fillIfPresent(page, TITLE_INPUTS, input.request.title);
    await humanPause(page, 900, 2_000);
    await fillIfPresent(page, CAPTION_INPUTS, input.request.caption);
    await humanPause(page, 1_200, 2_400);
    const publish = await waitUntilPublishReady(page);
    await clickHuman(page, publish);
    await clickConfirmIfPresent(page);
    await waitForPublishSuccess(page);
    await humanPause(page, 2_500, 5_000);
    return {
      platform_post_id: null,
      message: `RPA confirmed publish in the official ${input.request.platform} creator console (platform may still review).`,
    };
  } catch (error) {
    try {
      await page.screenshot({ path: screenshotPath });
    } catch {
      // Screenshot is best-effort.
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${detail} Screenshot: ${screenshotPath}`);
  } finally {
    await context.close();
  }
};
