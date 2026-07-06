import type {
  AspectRatio as SchemaAspectRatio,
  RenderPlan as SchemaRenderPlan,
  RenderScene as SchemaRenderScene,
  SceneType as SchemaSceneType,
} from "../schemas";

export type AspectRatio = SchemaAspectRatio;
export type SceneType = SchemaSceneType;
export type RenderPlan = SchemaRenderPlan;
export type RenderScene = SchemaRenderScene;
export type ThemeTokens = RenderPlan["theme"];
export type CaptionItem = RenderPlan["captions"]["items"][number];
export type SceneVisual = RenderScene["visual"];
