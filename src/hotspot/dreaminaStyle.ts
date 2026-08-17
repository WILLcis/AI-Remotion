/**
 * Shared Dreamina prompt fragments. Every hotspot call to Dreamina
 * (cover text2image and clip image2video) must include 口型匹配 + 字幕.
 */

export const DREAMINA_LIPSYNC_REQUIREMENT =
  "口型匹配：嘴唇明显开合、下颌活动，口型必须对准中文口播对白；禁止闭嘴静止，禁止只眨眼不张嘴。";

export const DREAMINA_IDENTITY_REQUIREMENT =
  "@Image 1 是封面静帧，必须作为视频第一帧，第一帧保留顶部金色书法和下方两行黄字黑边。人物开口说话后，封面两行黄字必须让位给口播字幕，禁止整段视频都叠着封面黄字。@Image 2 只复制人脸五官，禁止复制照片里的衣服、T恤图案、发型、体态、背景。保持同一张脸但明显美颜变年轻：约28到32岁，皮肤光滑透亮，轻度磨皮，法令纹几乎不可见，去掉眼袋和黑眼圈，胡茬淡，禁止沧桑显老、禁止皱纹和眼周细纹。穿深色正装衬衫或西装，禁止T恤。@Audio 1 只控制音色和表达方式，不要继承样本中的原句。";

export const DREAMINA_IDENTITY_LIPSYNC_REQUIREMENT =
  "口型匹配：嘴唇对准花括号里的口播对白，不要对准参考音频里的原句；禁止闭嘴静止，禁止只眨眼不张嘴。";

/** Cover is a still: mouth slightly open so image2video can start lip-sync. */
export const DREAMINA_COVER_LIPSYNC_REQUIREMENT =
  "口型匹配：人物嘴唇自然微启、可见口型，不要紧闭双唇，不要张大嘴喊话。这是封面静帧，为后续口型匹配做第一帧。";

export const DREAMINA_VIDEO_CAPTION_REQUIREMENT =
  "必须出中英双语口播字幕，禁止无字幕，禁止底部一条黑底白字长条，禁止播放按钮，禁止进度条。字幕位置固定在画面正下方居中（贴近底边安全区），不要贴在胸口，不要左中右下错落飘在半身。字体对齐财经口播参考：中文超大号加粗衬线（宋体/明体），字号明显大于半身字，白字，关键词（数字、涨、AI等）青铜金/橙金色，深色描边加轻投影；英文小号无衬线白字紧贴该句中文正下方，短译、禁止长句、禁止拼写错误。每屏一句中文加一句英文，水平居中。不要挡住脸、嘴、眼镜和手中钢笔。字幕必须与花括号口播逐句一致。";

export const DREAMINA_COVER_TEXT_REQUIREMENT = (
  keyword: string,
  line1: string,
  line2: string,
): string =>
  [
    "必须出封面字，禁止无字封面。",
    `顶部恰好2到4个汉字「${keyword}」：金色书法大字（笔触、金属质感、轻投影），这是文案重点词，不要写整句，不要挡住脸。`,
    `下方恰好两行加粗黄字、厚黑描边、无半透明底条，居中偏下，禁止折成三行或四行：第一行「${line1}」；第二行「${line2}」。每行不超过12字。`,
    "不要播放按钮，不要进度条，不要水印，不要乱码，不要额外英文。",
  ].join("");

export const stripPresenterLook = (presenter: string): string =>
  presenter
    .split("，")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/说话|口型|字幕|闭嘴/.test(part))
    .join("，");

export const splitCoverLines = (cover: string): [string, string] => {
  const parts = cover
    .split(/[，,]/)
    .map((part) => part.trim())
    .filter(Boolean);
  const clipLine = (text: string): string =>
    [...text].slice(0, 12).join("");
  if (parts.length >= 2) {
    return [clipLine(parts[0]!), clipLine(parts[1]!)];
  }
  const chars = [...cover.replace(/\s/g, "")];
  const line1 = chars.slice(0, 12).join("") || cover.trim();
  const line2 = chars.slice(12, 24).join("") || line1;
  return [line1, line2];
};

export const clipCoverKeyword = (keyword: string): string => {
  const chars = [...keyword.replace(/\s/g, "")].slice(0, 4);
  return chars.join("") || "热点";
};

export const shortenCoverCopy = (cover: string): string => {
  const [line1, line2] = splitCoverLines(cover);
  return `${line1}，${line2}`;
};

export const coverKeywordFromTags = (topic: string, tags: string): string | undefined => {
  const topicCompact = topic.replace(/\s/g, "");
  for (const raw of tags.split(/\s+/)) {
    const tag = raw.replace(/^#/, "").trim();
    const chars = [...tag];
    if (chars.length >= 2 && chars.length <= 4 && tag !== topicCompact) {
      return tag;
    }
  }
  return undefined;
};
