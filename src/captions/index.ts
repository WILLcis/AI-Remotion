import type { RenderPlan } from "../schemas";

export type CaptionItem = RenderPlan["captions"]["items"][number];

export const captionsFromRenderPlan = (plan: RenderPlan): CaptionItem[] => {
  return plan.scenes.map((scene) => ({
    start_frame: scene.start_frame,
    end_frame: scene.start_frame + scene.duration_frames,
    text: scene.caption,
  }));
};

export const formatSrtTimestamp = (frame: number, fps: number): string => {
  const totalMilliseconds = Math.round((frame / fps) * 1000);
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)},${pad(
    milliseconds,
    3,
  )}`;
};

export const renderSrt = (
  captions: CaptionItem[],
  fps: number,
  maxLineLength = 22,
): string => {
  return captions
    .map((caption, index) =>
      [
        String(index + 1),
        `${formatSrtTimestamp(caption.start_frame, fps)} --> ${formatSrtTimestamp(
          caption.end_frame,
          fps,
        )}`,
        wrapCaptionText(caption.text, maxLineLength),
      ].join("\n"),
    )
    .join("\n\n");
};

export const wrapCaptionText = (text: string, maxLineLength = 22): string => {
  const trimmed = text.trim();
  if (trimmed.length <= maxLineLength) {
    return trimmed;
  }

  const semanticSegments = splitBySemanticPunctuation(trimmed);
  const lines: string[] = [];
  let currentLine = "";

  for (const segment of semanticSegments) {
    if ((currentLine + segment).length <= maxLineLength) {
      currentLine += segment;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    if (segment.length > maxLineLength) {
      const hardWrapped = hardWrap(segment, maxLineLength);
      lines.push(...hardWrapped.slice(0, -1));
      currentLine = hardWrapped.at(-1) ?? "";
    } else {
      currentLine = segment;
    }
  }

  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  if (lines.length > 1 && (lines.at(-1)?.length ?? 0) <= 2) {
    const orphan = lines.pop();
    lines[lines.length - 1] = `${lines.at(-1) ?? ""}${orphan ?? ""}`;
  }

  return lines.join("\n");
};

const splitBySemanticPunctuation = (text: string): string[] => {
  return (
    text.match(/[^，。；、：！？,.;:!?]+[，。；、：！？,.;:!?]?/g) ?? [text]
  );
};

const hardWrap = (text: string, maxLineLength: number): string[] => {
  const lines: string[] = [];

  for (let index = 0; index < text.length; index += maxLineLength) {
    lines.push(text.slice(index, index + maxLineLength));
  }

  return lines;
};

const pad = (value: number, length: number): string => {
  return String(value).padStart(length, "0");
};
