import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  dreaminaQueryResult,
  dreaminaText2Image,
  parseDreaminaSubmitId,
} from "../media/dreaminaCli";
import type { HotspotClip } from "../schemas/hotspot";
import { DEFAULT_DREAMINA_PRESENTER_PROMPT } from "../schemas/hotspot";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export const latestImage = (dir: string): string | undefined => {
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .at(-1);
};

export const buildDreaminaCoverPrompt = (clip: HotspotClip): string => {
  const presenter =
    clip.dreamina_prompt?.trim() || DEFAULT_DREAMINA_PRESENTER_PROMPT;
  return [
    presenter
      .replace(/不要烧录字幕。?/g, "")
      .replace(/不要字幕，不要修改内容。?/g, "")
      .replace(/不要字幕。?/g, "")
      .replace(/正在对镜头用中文说话，嘴唇明显开合，口型跟随对白，下颌活动，不要闭嘴静止，不要画面完全静止，/g, "")
      .trim(),
    "这是竖版9:16短视频封面静帧，不是动态视频。人物半身、面部清晰、看向镜头。",
    `画面必须叠加清晰可读、无错别字的中文大字。主标题：「${clip.hook_title}」。封面文案：「${clip.cover}」。`,
    "主标题醒目黄色，封面文案白色，深色半透明底，文字居中，电影感布光。不要水印，不要乱码，不要额外英文。",
  ].join("");
};

export const generateDreaminaCover = async (input: {
  clip: HotspotClip;
  downloadDir: string;
  approvePaid: boolean;
  text2image?: typeof dreaminaText2Image;
  queryResult?: typeof dreaminaQueryResult;
  parseSubmitId?: typeof parseDreaminaSubmitId;
}): Promise<string> => {
  mkdirSync(input.downloadDir, { recursive: true });
  const text2image = input.text2image ?? dreaminaText2Image;
  const queryResult = input.queryResult ?? dreaminaQueryResult;
  const parseSubmitId = input.parseSubmitId ?? parseDreaminaSubmitId;
  const result = await text2image({
    approvePaid: input.approvePaid,
    downloadDir: input.downloadDir,
    prompt: buildDreaminaCoverPrompt(input.clip),
    ratio: "9:16",
    resolutionType: "2k",
    pollSeconds: 120,
  });
  const submitId = parseSubmitId(result.stdout);
  if (!submitId) {
    throw new Error(
      `Dreamina text2image produced no submit_id for cover ${input.clip.index}. ${result.stdout} ${result.stderr}`,
    );
  }
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await queryResult({
      submitId,
      downloadDir: input.downloadDir,
    });
    const imagePath = latestImage(input.downloadDir);
    if (imagePath) {
      return imagePath;
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(
    `Dreamina text2image produced no cover image for clip ${input.clip.index} after waiting. ${result.stdout} ${result.stderr}`,
  );
};
