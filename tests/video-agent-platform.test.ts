import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { FLAGS, LocalProvider } from "../flags/feature-flags";
import { routeVideoJob } from "../src/agent/videoRouter";
import { videoJobSchema } from "../src/schemas/videoJob";

const makeJob = (overrides: Record<string, unknown> = {}) => ({
  job_id: "test-video-job",
  workflow: "auto",
  source: {
    type: "topic",
    subject: "普通人如何理解 Remotion",
    refs: [],
  },
  output: {
    duration_seconds: 60,
    aspect_ratio: "16:9",
    language: "zh",
  },
  presenter: { mode: "none" },
  render: { engine: "auto" },
  review_gates: {
    script: "pending",
    storyboard: "pending",
    final_render: "pending",
  },
  ...overrides,
});

const readProjectFile = (filePath: string): string =>
  readFileSync(path.join(process.cwd(), filePath), "utf8");

const readFrontmatter = (filePath: string): Record<string, unknown> => {
  const source = readProjectFile(filePath);
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error(`${filePath} is missing YAML frontmatter`);
  }
  return YAML.parse(match[1]) as Record<string, unknown>;
};

describe("video agent platform", () => {
  it("routes an explicit product promo to HyperFrames", () => {
    const route = routeVideoJob(
      makeJob({
        workflow: "product-promo",
        source: {
          type: "product-brief",
          subject: "deepdog 产品宣传片",
          refs: ["briefs/deepdog.md"],
        },
      }),
      { enabled: true },
    );

    expect(route).toMatchObject({
      workflow: "product-promo",
      primary_agent: "product-promo-producer",
      renderer: "hyperframes",
      delegated_capabilities: [],
    });
    expect(route.requires_approval).toEqual([
      "script",
      "storyboard",
      "final_render",
    ]);
  });

  it("keeps a product promo primary when it delegates a digital-human presenter", () => {
    const route = routeVideoJob(
      makeJob({
        source: {
          type: "website",
          subject: "https://example.com product launch",
          refs: [],
        },
        presenter: { mode: "digital-human", provider: "heygen" },
      }),
      { enabled: true },
    );

    expect(route).toMatchObject({
      workflow: "product-promo",
      primary_agent: "product-promo-producer",
      delegated_capabilities: ["digital-human-presenter"],
      provider_requirements: ["heygen"],
    });
  });

  it("routes a non-product script with a presenter to the digital-human agent", () => {
    const route = routeVideoJob(
      makeJob({
        source: { type: "script", subject: "季度团队更新", refs: [] },
        presenter: { mode: "digital-human", provider: "heygen" },
      }),
      { enabled: true },
    );

    expect(route).toMatchObject({
      workflow: "digital-human",
      primary_agent: "digital-human-producer",
      renderer: "remotion",
      provider_requirements: ["heygen"],
    });
  });

  it("routes a topic without a presenter to the faceless explainer", () => {
    const route = routeVideoJob(makeJob(), { enabled: true });

    expect(route).toMatchObject({
      workflow: "faceless-explainer",
      primary_agent: "faceless-explainer-producer",
      renderer: "remotion",
    });
  });

  it("rejects invalid workflow combinations and renderer overrides", () => {
    expect(
      videoJobSchema.safeParse(
        makeJob({
          workflow: "digital-human",
          presenter: { mode: "none" },
        }),
      ).success,
    ).toBe(false);

    expect(
      videoJobSchema.safeParse(
        makeJob({ presenter: { mode: "digital-human" } }),
      ).success,
    ).toBe(false);

    expect(() =>
      routeVideoJob(
        makeJob({
          workflow: "product-promo",
          render: { engine: "remotion" },
        }),
        { enabled: true },
      ),
    ).toThrow(/requires renderer hyperframes/);
  });

  it("keeps routing behind a fail-safe kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_AGENT_PLATFORM]: { enabled: false },
    });

    const enabled = await provider.isEnabled(
      FLAGS.VIDEO_AGENT_PLATFORM,
      {},
      true,
    );
    expect(enabled).toBe(false);
    expect(() => routeVideoJob(makeJob(), { enabled })).toThrow(
      /VIDEO_AGENT_PLATFORM/,
    );
  });

  it("ships one root entry skill and three specialist profiles", () => {
    const skill = readProjectFile(".devin/skills/video-producer/SKILL.md");
    const productPromo = readProjectFile(
      ".devin/agents/product-promo-producer.md",
    );
    const digitalHuman = readProjectFile(
      ".devin/agents/digital-human-producer.md",
    );
    const facelessExplainer = readProjectFile(
      ".devin/agents/faceless-explainer-producer.md",
    );

    expect(readFrontmatter(".devin/skills/video-producer/SKILL.md")).toMatchObject({
      name: "video-producer",
      triggers: ["user", "model"],
    });
    expect(
      readFrontmatter(".devin/agents/product-promo-producer.md"),
    ).toMatchObject({
      name: "product-promo-producer",
      "max-nesting": 2,
    });
    expect(
      readFrontmatter(".devin/agents/digital-human-producer.md"),
    ).toMatchObject({ name: "digital-human-producer" });
    expect(
      readFrontmatter(".devin/agents/faceless-explainer-producer.md"),
    ).toMatchObject({ name: "faceless-explainer-producer" });
    expect(skill).toContain("Dispatch exactly one primary");
    expect(productPromo).toContain("max-nesting: 2");
    expect(productPromo).toContain("needs_approval");
    expect(digitalHuman).toContain("rights.yaml");
    expect(digitalHuman).toContain("needs_approval");
    expect(facelessExplainer).toContain("render-plan.json");
    expect(facelessExplainer).toContain("needs_approval");
  });

  it("keeps dev and prod kill-switch keys in parity", () => {
    const dev = readProjectFile("config/.env.dev.example");
    const prod = readProjectFile("config/.env.prod.example");

    expect(dev).toContain('FLAG_video_agent_platform={"enabled":false}');
    expect(prod).toContain('FLAG_video_agent_platform={"enabled":false}');
  });
});
