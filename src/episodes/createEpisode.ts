import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { AspectRatio, Brief } from "../schemas";

export type CreateEpisodeSkeletonOptions = {
  aspectRatio?: AspectRatio;
  audience?: string;
  durationSeconds?: number;
  episodesRoot?: string;
  id: string;
  platform?: string;
  tone?: string;
  topic?: string;
  visualStyle?: string;
  voice?: string;
};

export type CreateEpisodeSkeletonResult = {
  briefPath: string;
  episodeDir: string;
};

export const createEpisodeSkeleton = ({
  aspectRatio = "9:16",
  audience = "需要快速理解主题的中文短视频观众",
  durationSeconds = 60,
  episodesRoot = path.resolve("episodes"),
  id,
  platform = "抖音",
  tone = "清楚、自然、不过度夸张",
  topic,
  visualStyle = "深色背景、信息卡片、轻量动效",
  voice = "亲切自然的中文旁白",
}: CreateEpisodeSkeletonOptions): CreateEpisodeSkeletonResult => {
  assertSafeEpisodeId(id);

  const episodeDir = path.join(episodesRoot, id);
  if (existsSync(episodeDir)) {
    throw new Error(`Episode already exists: ${episodeDir}`);
  }

  mkdirSync(path.join(episodeDir, "assets"), { recursive: true });
  mkdirSync(path.join(episodeDir, "audio"), { recursive: true });

  const brief: Brief = {
    aspect_ratio: aspectRatio,
    audience,
    duration_seconds: durationSeconds,
    must_avoid: ["不要把 AI 生成内容描述为已经人工核实的事实"],
    must_include: [],
    platform,
    source_notes: [],
    tone,
    topic: topic ?? id,
    visual_style: visualStyle,
    voice,
  };
  const briefPath = path.join(episodeDir, "brief.yaml");

  writeFileSync(briefPath, YAML.stringify(brief));
  writeFileSync(path.join(episodeDir, "assets", ".gitkeep"), "");
  writeFileSync(path.join(episodeDir, "audio", ".gitkeep"), "");

  return {
    briefPath,
    episodeDir,
  };
};

const assertSafeEpisodeId = (id: string): void => {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
    throw new Error(
      "Use a safe episode id: lowercase letters, numbers, and hyphens only.",
    );
  }
};
