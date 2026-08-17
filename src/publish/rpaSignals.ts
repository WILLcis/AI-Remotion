export const rpaPageLooksSuccessful = (url: string, visibleText: string): boolean => {
  const text = visibleText.replace(/\s+/g, "");
  if (/发表成功|发布成功|笔记发布成功|发布完成|已发布/.test(text)) {
    return true;
  }
  if (/channels\.weixin\.qq\.com\/platform\/post\/list/.test(url)) {
    return true;
  }
  if (/creator\.xiaohongshu\.com\/.*(success|publish\/success)/i.test(url)) {
    return true;
  }
  return false;
};

export const isPrimaryPublishLabel = (label: string): boolean => {
  const trimmed = label.replace(/\s+/g, "");
  return trimmed === "发表" || trimmed === "发布";
};
