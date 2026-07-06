export type AspectRatio = "9:16" | "16:9";

export type SceneType =
  | "title"
  | "key_point"
  | "list"
  | "comparison"
  | "timeline"
  | "quote"
  | "cta";

export type ThemeTokens = {
  id: string;
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  border: string;
};

export type CaptionItem = {
  start_frame: number;
  end_frame: number;
  text: string;
};

export type SceneVisual = {
  eyebrow?: string;
  primary?: string;
  secondary?: string;
  bullets?: string[];
  quote?: string;
  attribution?: string;
  left_label?: string;
  left_points?: string[];
  right_label?: string;
  right_points?: string[];
  timeline_items?: Array<{
    label: string;
    text: string;
  }>;
};

export type RenderScene = {
  id: string;
  type: SceneType;
  title: string;
  narration: string;
  caption: string;
  duration_seconds: number;
  start_frame: number;
  duration_frames: number;
  visual: SceneVisual;
};

export type RenderPlan = {
  episode_id: string;
  metadata: {
    title: string;
    subtitle?: string;
    platform: string;
    language: "zh" | "en";
    duration_seconds: number;
    aspect_ratio: AspectRatio;
  };
  theme: ThemeTokens;
  video: {
    fps: number;
    width: number;
    height: number;
    duration_frames: number;
    safe_area: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  audio: {
    voiceover_path: string | null;
  };
  captions: {
    enabled: boolean;
    items: CaptionItem[];
  };
  scenes: RenderScene[];
};
