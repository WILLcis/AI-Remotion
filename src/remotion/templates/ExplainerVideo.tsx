import type { CSSProperties } from "react";
import {
  AbsoluteFill,
  interpolate,
  Series,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
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
  return (
    <AbsoluteFill className="explainer" style={themeStyle(plan.theme)}>
      <BackgroundGrid />
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
      <header className="scene-header">
        <span className="scene-index">{String(index + 1).padStart(2, "0")}</span>
        <span>{plan.metadata.title}</span>
      </header>
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
      </main>
      {plan.captions.enabled ? (
        <footer
          className="caption"
          style={{
            left: plan.video.safe_area.left,
            right: plan.video.safe_area.right,
            bottom: plan.video.safe_area.bottom,
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
  }
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
