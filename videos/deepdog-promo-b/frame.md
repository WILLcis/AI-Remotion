---
name: deepdog-control-tower
colors:
  canvas: "#05070b"
  surface: "#0d1119"
  surface_raised: "#151a24"
  ink: "#f4f6fb"
  ink_muted: "#9aa3b2"
  accent: "#8b7cf6"
  accent_soft: "#c0b8ff"
  success: "#6ee7a8"
  danger: "#ff7b86"
  rule: "#2a3140"
typography:
  display:
    family: "Georgia, 'Times New Roman', serif"
    weight: 400
  body:
    family: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    weight: 500
  mono:
    family: "'JetBrains Mono', 'SFMono-Regular', Consolas, monospace"
    weight: 500
spacing:
  safe_x: 104
  safe_top: 72
  caption_keepout_y: 896
components:
  corner_radius: 18
  panel_border: "2px solid #2a3140"
  panel_shadow: "0 28px 80px rgba(0,0,0,0.38)"
  hairline: "1px solid #2a3140"
---

## Overview

A dark editorial system for a serious developer product. The atmosphere is a quiet operations room, not science fiction: deep navy-black, crisp warm-white type, one controlled violet identity color, and green reserved for verified completion. The frame should feel closer to Linear, Vercel, and Stripe than a game HUD.

## The Frame

- Use the exact `#05070b` canvas in every scene.
- Build depth with localized radial light, a restrained 64px grid, hairline rules, and large cropped serif words at low opacity.
- Every frame has background, information surface, and foreground metadata layers.
- Keep important content above y=896 so the caption rail remains clear.
- Use violet for agents, selected work, and active lifecycle states. Use green only for online or complete. Use red only for explicit fail states.

## Typography

- Display: large, sentence-case Georgia with tight line spacing; 80–132px for primary statements.
- Body/UI: Inter at 26–36px with strong hierarchy.
- Mono: JetBrains Mono at 18–26px for issue keys, timestamps, lifecycle states, and technical labels.
- Prefer short Chinese lines. Never use gradient-filled text.

## Components

- Panels are dark flat surfaces with 2px tinted borders and restrained shadows.
- Issue cards use sharp information hierarchy: key, title, assignee, status, progress.
- Human identity is neutral warm-white; agent identity is violet.
- Diagrams use orthogonal or gently curved SVG connectors with clean endpoints.
- Status pills are compact, high-contrast, and never decorative.
- Illustrative interfaces must be labeled `CONCEPTUAL VIEW` or otherwise read as diagrams, not captured product UI.

## Composition Rules

- Use asymmetric 60/40 or 70/30 layouts for explanatory beats.
- Use centered compositions only for the lifecycle climax and final brand lockup.
- Primary objects occupy at least 40% of the frame.
- Anchor metadata to frame edges: scene number top-left, system label top-right, progress rail near the upper edge.
- Alternate dense operational frames with one deliberate breather in the trust beat.

## Motion

- Smooth long-tail settles; no bounce, elastic, or perpetual loops.
- Reveals follow narration cues and continue through the back half of each frame.
- Use deterministic SVG line draws, card cascades, state swaps, finite loader arcs, camera pull-backs, and velocity-matched seams.
- Holds are still except for finite diegetic work indicators.
- Transition palette: zoom-through for section changes, push-slide for related operational beats, blur-crossfade for trust/CTA.

## Captions

- Bottom-centered dark translucent pill, maximum width 1420px.
- Chinese text 42px/1.35, warm white; current phrase may use accent-soft.
- Keep 72px bottom margin and 40px horizontal padding.

## Do

- Show verifiable state, ownership of work objects, and operational visibility.
- Keep motion dense but purposeful.
- Let monospace metadata and precise alignment provide production polish.

## Do Not

- No neon rainbow, holograms, glowing circuit brains, explosions, generic robot imagery, fake customer UI, or fake social proof.
- No unsupported accountability trees or permission boundaries.
- No product name capitalization other than lowercase `deepdog`.
- No BIOS.
