import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { createVideoIntakeDecision } from "../src/schemas/videoIntake";

describe("video job intake", () => {
  const defaults = {
    aspect_ratio: "9:16",
    duration_seconds: 30,
    language: "zh",
  } as const;

  it("creates a pending-gate product Job draft from a complete request", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "为 AI-Remotion 产品做一个 30 秒竖屏宣传视频",
      generation_service: "hyperframes",
      request_id: "promo-intake",
    });

    expect(decision.status).toBe("draft_ready");
    expect(decision.draft_job).toMatchObject({
      job_id: "promo-intake",
      workflow: "auto",
      source: { type: "product-brief" },
      output: defaults,
      generation: { service: "hyperframes" },
      render: { engine: "hyperframes" },
      review_gates: {
        script: "pending",
        storyboard: "pending",
        final_render: "pending",
      },
    });
    expect(decision.draft_job?.review_gates).toEqual({
      script: "pending",
      storyboard: "pending",
      final_render: "pending",
    });
  });

  it("auto-approves gates and skips extra consent when generation_service is dreamina", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "讲解 Remotion 的基础概念",
      generation_service: "dreamina",
      request_id: "dreamina-autopilot",
    });

    expect(decision.status).toBe("draft_ready");
    expect(decision.draft_job?.review_gates).toEqual({
      script: "approved",
      storyboard: "approved",
      final_render: "approved",
      publish: "approved",
    });
    expect(decision.next_action).toMatch(/Do not wait for review gates/i);
    expect(decision.assumptions.join(" ")).toMatch(/consent/i);
  });

  it("creates a pending-gate topic draft without inventing approvals", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "讲解 Remotion 的基础概念",
      generation_service: "remotion",
      request_id: "topic-intake",
    });

    expect(decision.status).toBe("draft_ready");
    expect(decision.draft_job).toMatchObject({
      source: { type: "topic" },
      workflow: "auto",
      generation: { service: "remotion" },
      review_gates: {
        script: "pending",
        storyboard: "pending",
        final_render: "pending",
      },
    });
    expect(decision.assumptions.join(" ")).toMatch(/pending|approval/i);
  });

  it("requires an explicit generation_service before drafting", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "讲解 Remotion 的基础概念",
    });

    expect(decision).toMatchObject({
      draft_job: null,
      status: "needs_clarification",
    });
    expect(decision.missing_fields).toContain("generation_service");
    expect(decision.questions.join("\n")).toMatch(/dreamina|heygen|remotion/i);
  });

  it("requires an explicit local ref for existing-video requests", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "把已有长视频剪成 30 秒短视频",
      generation_service: "hyperframes",
    });

    expect(decision).toMatchObject({
      draft_job: null,
      status: "needs_clarification",
    });
    expect(decision.missing_fields).toContain("known_refs");
  });

  it("requires refs for music and deck requests", () => {
    expect(
      createVideoIntakeDecision({
        defaults,
        description: "用本地音乐做一条节拍卡点短片",
        generation_service: "hyperframes",
      }).missing_fields,
    ).toContain("known_refs");

    expect(
      createVideoIntakeDecision({
        defaults,
        description: "把这份 pitch deck 做成演示文稿视频",
        generation_service: "hyperframes",
      }).missing_fields,
    ).toContain("known_refs");
  });

  it("requires a provider instead of inventing one for digital-human requests", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "用数字人讲解这个 Remotion 教程",
      generation_service: "heygen",
    });

    expect(decision).toMatchObject({
      draft_job: null,
      status: "needs_clarification",
    });
    expect(decision.missing_fields).toContain("presenter_provider");
  });

  it("creates an explicit shorts-repackage draft without changing existing-video auto routing", () => {
    const decision = createVideoIntakeDecision({
      defaults,
      description: "把这条已有视频重新包装成一个短视频版本",
      generation_service: "hyperframes",
      known_refs: ["episodes/res/video/HeyGen_out.mp4"],
    });

    expect(decision.draft_job).toMatchObject({
      source: { type: "existing-video" },
      workflow: "shorts-repackage",
      generation: { service: "hyperframes" },
    });
  });

  it("asks for missing output defaults rather than inventing them", () => {
    const decision = createVideoIntakeDecision({
      description: "讲解 Remotion 的基础概念",
      generation_service: "remotion",
    });

    expect(decision).toMatchObject({
      draft_job: null,
      status: "needs_clarification",
    });
    expect(decision.missing_fields).toEqual(
      expect.arrayContaining([
        "defaults.duration_seconds",
        "defaults.aspect_ratio",
        "defaults.language",
      ]),
    );
  });

  it("prints JSON only from the video:intake CLI", () => {
    const output = execFileSync(
      "npm",
      [
        "run",
        "video:intake",
        "--",
        "--request",
        "tests/fixtures/video-intake/product-promo.json",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: process.env,
      },
    );
    const jsonStart = output.indexOf("{");
    const decision = JSON.parse(output.slice(jsonStart)) as {
      status: string;
      draft_job: { review_gates: Record<string, string> } | null;
    };

    expect(decision.status).toBe("draft_ready");
    expect(decision.draft_job?.review_gates).toEqual({
      script: "pending",
      storyboard: "pending",
      final_render: "pending",
    });
  });
});
