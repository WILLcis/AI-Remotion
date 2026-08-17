import { mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import {
  dreaminaImage2Image,
  dreaminaQueryResult,
  dreaminaText2Image,
  parseDreaminaSubmitId,
} from "../media/dreaminaCli";
import type { HotspotClip } from "../schemas/hotspot";
import { DEFAULT_DREAMINA_PRESENTER_PROMPT } from "../schemas/hotspot";
import {
  DREAMINA_COVER_LIPSYNC_REQUIREMENT,
  DREAMINA_COVER_TEXT_REQUIREMENT,
  clipCoverKeyword,
  splitCoverLines,
  stripPresenterLook,
} from "./dreaminaStyle";

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

export const latestImage = (dir: string): string | undefined => {
  mkdirSync(dir, { recursive: true });
  return readdirSync(dir)
    .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .at(-1);
};

export const buildDreaminaCoverPrompt = (
  clip: HotspotClip,
  options: { identityFromPhoto?: boolean } = {},
): string => {
  const presenter =
    clip.dreamina_prompt?.trim() || DEFAULT_DREAMINA_PRESENTER_PROMPT;
  const look = options.identityFromPhoto
    ? [
        "输入照片只复制人脸五官（脸型、眼睛、鼻子、嘴巴、肤色、痣），不要衣服、T恤图案、发型、体态、背景。",
        "保持同一张脸但明显美颜变年轻：约28到32岁，皮肤光滑透亮，轻度磨皮，法令纹几乎不可见，去掉眼袋和黑眼圈，胡茬淡，禁止沧桑显老、禁止皱纹和眼周细纹。",
        "穿深色正装衬衫或西装，禁止T恤和胸前图案。",
        `其余形象：${stripPresenterLook(presenter)}。`,
      ].join("")
    : stripPresenterLook(presenter);
  const [line1, line2] = splitCoverLines(clip.cover);
  return [
    look,
    "这是竖版9:16短视频封面静帧，不是动态视频。人物半身、面部清晰。",
    DREAMINA_COVER_LIPSYNC_REQUIREMENT,
    DREAMINA_COVER_TEXT_REQUIREMENT(clipCoverKeyword(clip.cover_keyword), line1, line2),
  ].join("");
};

export const generateDreaminaCover = async (input: {
  clip: HotspotClip;
  downloadDir: string;
  approvePaid: boolean;
  photoPath?: string;
  image2image?: typeof dreaminaImage2Image;
  text2image?: typeof dreaminaText2Image;
  queryResult?: typeof dreaminaQueryResult;
  parseSubmitId?: typeof parseDreaminaSubmitId;
}): Promise<string> => {
  mkdirSync(input.downloadDir, { recursive: true });
  const text2image = input.text2image ?? dreaminaText2Image;
  const image2image = input.image2image ?? dreaminaImage2Image;
  const queryResult = input.queryResult ?? dreaminaQueryResult;
  const parseSubmitId = input.parseSubmitId ?? parseDreaminaSubmitId;
  const identity = Boolean(input.photoPath);
  const prompt = buildDreaminaCoverPrompt(input.clip, {
    identityFromPhoto: identity,
  });
  const mode = identity ? "image2image" : "text2image";
  const result = identity
    ? await image2image({
        approvePaid: input.approvePaid,
        downloadDir: input.downloadDir,
        imagePaths: [input.photoPath!],
        prompt,
        ratio: "9:16",
        resolutionType: "2k",
        pollSeconds: 120,
      })
    : await text2image({
        approvePaid: input.approvePaid,
        downloadDir: input.downloadDir,
        prompt,
        ratio: "9:16",
        resolutionType: "2k",
        pollSeconds: 120,
      });
  const submitId = parseSubmitId(result.stdout);
  if (!submitId) {
    throw new Error(
      `Dreamina ${mode} produced no submit_id for cover ${input.clip.index}. ${result.stdout} ${result.stderr}`,
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
    `Dreamina ${mode} produced no cover image for clip ${input.clip.index} after waiting. ${result.stdout} ${result.stderr}`,
  );
};
