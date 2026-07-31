import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  OffthreadVideo,
  Series,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { getEpisodeVoiceoverStaticPath } from "../episodeAudio";
import { getEpisodeAssetStaticPath } from "../episodeAssets";
import type { RenderPlan, RenderScene, ThemeTokens } from "../types";

type ThemeStyle = CSSProperties & {
  "--bg": string;
  "--surface": string;
  "--surface-muted": string;
  "--text": string;
  "--text-muted": string;
  "--accent": string;
  "--accent-strong": string;
  "--border": string;
};

const themeStyle = (theme: ThemeTokens): ThemeStyle => ({
  "--bg": theme.background,
  "--surface": theme.surface,
  "--surface-muted": theme.surfaceMuted,
  "--text": theme.text,
  "--text-muted": theme.textMuted,
  "--accent": theme.accent,
  "--accent-strong": theme.accentStrong,
  "--border": theme.border,
});

export const ExplainerVideo: React.FC<RenderPlan> = (plan) => {
  const orientationClass =
    plan.metadata.aspect_ratio === "16:9"
      ? "explainer-landscape"
      : "explainer-vertical";

  return (
    <AbsoluteFill
      className={`explainer ${orientationClass}`}
      style={themeStyle(plan.theme)}
    >
      <BackgroundGrid />
      {plan.audio.voiceover_path ? (
        <Audio
          src={staticFile(
            getEpisodeVoiceoverStaticPath({
              episodeId: plan.episode_id,
              voiceoverPath: plan.audio.voiceover_path,
            }),
          )}
        />
      ) : null}
      <Series>
        {plan.scenes.map((scene, index) => (
          <Series.Sequence
            durationInFrames={scene.duration_frames}
            key={scene.id}
          >
            <SceneFrame index={index} plan={plan} scene={scene} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};

const BackgroundGrid: React.FC = () => {
  return (
    <AbsoluteFill className="background-grid">
      <div className="background-accent background-accent-top" />
      <div className="background-accent background-accent-bottom" />
    </AbsoluteFill>
  );
};

type SceneFrameProps = {
  index: number;
  plan: RenderPlan;
  scene: RenderScene;
};

const SceneFrame: React.FC<SceneFrameProps> = ({ index, plan, scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isFullAvatar =
    plan.avatar?.enabled === true &&
    plan.avatar.layout === "full" &&
    plan.avatar.clips.some((clip) => clip.scene_id === scene.id);
  const enter = spring({
    frame,
    fps,
    config: {
      damping: 22,
      stiffness: 130,
    },
  });
  const fade = interpolate(frame, [0, 12], [0.35, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill className="scene">
      {isFullAvatar ? <AvatarOverlay plan={plan} scene={scene} /> : null}
      <header className="scene-header" style={{ position: "relative", zIndex: 1 }}>
        <span className="scene-index">{String(index + 1).padStart(2, "0")}</span>
        <span>{plan.metadata.title}</span>
      </header>
      {!isFullAvatar ? (
        <main
          className={`scene-body scene-${scene.type}`}
          style={{
            opacity: fade,
            transform: `translateY(${(1 - enter) * 36}px)`,
          }}
        >
          <div className="scene-copy">
            {scene.visual.eyebrow ? (
              <p className="eyebrow">{scene.visual.eyebrow}</p>
            ) : null}
            <h1>{scene.title}</h1>
            <p className="narration">{scene.narration}</p>
          </div>
          <SceneVisual scene={scene} />
          <AvatarOverlay plan={plan} scene={scene} />
        </main>
      ) : null}
      {plan.captions.enabled ? (
        <footer
          className="caption"
          style={{
            left: plan.video.safe_area.left,
            right: plan.video.safe_area.right,
            bottom: plan.video.safe_area.bottom,
            zIndex: 1,
          }}
        >
          {scene.caption}
        </footer>
      ) : null}
    </AbsoluteFill>
  );
};

const SceneVisual: React.FC<{ scene: RenderScene }> = ({ scene }) => {
  switch (scene.type) {
    case "title":
      return (
        <section className="visual-title">
          <div className="signal-line" />
          <p>{scene.visual.primary}</p>
          <span>{scene.visual.secondary}</span>
        </section>
      );

    case "key_point":
      return (
        <section className="visual-key">
          <span className="small-label">structured artifact</span>
          <strong>{scene.visual.primary}</strong>
          <p>{scene.visual.secondary}</p>
        </section>
      );

    case "image_card":
      return (
        <section className="visual-image-card">
          <div className="image-card-frame">
            <div className="image-card-window">
              <span>{scene.visual.eyebrow ?? "Visual"}</span>
              <strong>{scene.visual.primary}</strong>
            </div>
            <div className="image-card-assets">
              {scene.visual.assets?.map((asset) => (
                <p key={asset}>{asset}</p>
              ))}
            </div>
          </div>
          <p>{scene.visual.secondary}</p>
        </section>
      );

    case "list":
      return (
        <section className="visual-list">
          {scene.visual.bullets?.map((item, itemIndex) => (
            <div className="list-row" key={item}>
              <span>{String(itemIndex + 1).padStart(2, "0")}</span>
              <p>{item}</p>
            </div>
          ))}
        </section>
      );

    case "comparison":
      return (
        <section className="visual-comparison">
          <ComparisonColumn
            label={scene.visual.left_label}
            points={scene.visual.left_points}
          />
          <ComparisonColumn
            label={scene.visual.right_label}
            points={scene.visual.right_points}
            highlighted
          />
        </section>
      );

    case "timeline":
      return (
        <section className="visual-timeline">
          {scene.visual.timeline_items?.map((item) => (
            <div className="timeline-step" key={item.label}>
              <span>{item.label}</span>
              <p>{item.text}</p>
            </div>
          ))}
        </section>
      );

    case "quote":
      return (
        <section className="visual-quote">
          <blockquote>{scene.visual.quote}</blockquote>
          <cite>{scene.visual.attribution}</cite>
        </section>
      );

    case "cta":
      return (
        <section className="visual-cta">
          <p>{scene.visual.primary}</p>
          <span>{scene.visual.secondary}</span>
        </section>
      );

    case "talking_avatar":
      return (
        <section className="visual-key">
          <span className="small-label">talking avatar</span>
          <strong>{scene.visual.primary ?? scene.title}</strong>
          <p>{scene.visual.secondary}</p>
        </section>
      );
  }
};

const AvatarOverlay: React.FC<{ plan: RenderPlan; scene: RenderScene }> = ({
  plan,
  scene,
}) => {
  const clip = plan.avatar?.clips.find((item) => item.scene_id === scene.id);
  if (!plan.avatar?.enabled || !clip) {
    return null;
  }

  const isFull = plan.avatar.layout === "full";
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: isFull ? 0 : 28,
        bottom: isFull ? 0 : 170,
        height: isFull ? "100%" : "52%",
        overflow: "hidden",
        position: "absolute",
        right: isFull ? 0 : 36,
        width: isFull ? "100%" : "42%",
        zIndex: isFull ? 0 : undefined,
      }}
    >
      <OffthreadVideo
        muted
        src={staticFile(
          getEpisodeAssetStaticPath({
            assetPath: clip.path,
            episodeId: plan.episode_id,
          }),
        )}
        style={{ height: "100%", objectFit: "cover", width: "100%" }}
      />
    </div>
  );
};

type ComparisonColumnProps = {
  highlighted?: boolean;
  label?: string;
  points?: string[];
};

const ComparisonColumn: React.FC<ComparisonColumnProps> = ({
  highlighted = false,
  label,
  points = [],
}) => {
  return (
    <div className={highlighted ? "comparison-column highlighted" : "comparison-column"}>
      <strong>{label}</strong>
      {points.map((point) => (
        <p key={point}>{point}</p>
      ))}
    </div>
  );
};
