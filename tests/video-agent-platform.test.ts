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

const fixtureRoutes = [
  {
    fixturePath: "tests/fixtures/video-jobs/product-promo.yaml",
    workflow: "product-promo",
    primaryAgent: "product-promo-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/digital-human.yaml",
    workflow: "digital-human",
    primaryAgent: "digital-human-producer",
    renderer: "remotion",
    providerRequirements: ["heygen"],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/faceless-explainer.yaml",
    workflow: "faceless-explainer",
    primaryAgent: "faceless-explainer-producer",
    renderer: "remotion",
    providerRequirements: [],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/existing-video-recut.yaml",
    workflow: "existing-video-recut",
    primaryAgent: "existing-video-recut-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: [],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/shorts-repackage.yaml",
    workflow: "shorts-repackage",
    primaryAgent: "shorts-repackage-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/embedded-captions.yaml",
    workflow: "embedded-captions",
    primaryAgent: "embedded-captions-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/pr-video.yaml",
    workflow: "pr-video",
    primaryAgent: "pr-video-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/music-video.yaml",
    workflow: "music-video",
    primaryAgent: "music-video-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/video-translation.yaml",
    workflow: "video-translation",
    primaryAgent: "video-translation-producer",
    renderer: "remotion",
    providerRequirements: ["heygen"],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/motion-graphics.yaml",
    workflow: "motion-graphics",
    primaryAgent: "motion-graphics-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/slideshow.yaml",
    workflow: "slideshow",
    primaryAgent: "slideshow-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["script", "storyboard", "final_render"],
  },
  {
    fixturePath: "tests/fixtures/video-jobs/remotion-port.yaml",
    workflow: "remotion-port",
    primaryAgent: "remotion-port-producer",
    renderer: "hyperframes",
    providerRequirements: [],
    requiresApproval: ["storyboard", "final_render"],
  },
] as const;

describe("video agent platform", () => {
  it.each(fixtureRoutes)(
    "parses and routes $fixturePath",
    ({
      fixturePath,
      workflow,
      primaryAgent,
      renderer,
      providerRequirements,
      requiresApproval,
    }) => {
      const job = videoJobSchema.parse(
        YAML.parse(readProjectFile(fixturePath)) as unknown,
      );
      const route = routeVideoJob(job, { enabled: true });

      expect(route).toMatchObject({
        workflow,
        primary_agent: primaryAgent,
        renderer,
      });
      expect(route.provider_requirements).toEqual(providerRequirements);
      expect(route.requires_approval).toEqual(requiresApproval);
      expect(() => routeVideoJob(job, { enabled: false })).toThrow(
        /VIDEO_AGENT_PLATFORM/,
      );
    },
  );

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

  it("keeps existing-video auto routing on recut while supporting explicit shorts repackage", () => {
    const source = {
      type: "existing-video",
      subject: "HeyGen Human3 设计化重剪试运行",
      refs: ["episodes/res/video/HeyGen_out.mp4"],
    };
    const autoRoute = routeVideoJob(makeJob({ source }), { enabled: true });
    const explicitRoute = routeVideoJob(
      makeJob({ workflow: "existing-video-recut", source }),
      { enabled: true },
    );

    expect(autoRoute).toMatchObject({
      workflow: "existing-video-recut",
      primary_agent: "existing-video-recut-producer",
      renderer: "hyperframes",
      provider_requirements: [],
      delegated_capabilities: [],
    });
    expect(autoRoute.reason).toMatch(/existing footage recut pipeline/);
    expect(explicitRoute).toMatchObject({
      workflow: "existing-video-recut",
      primary_agent: "existing-video-recut-producer",
      renderer: "hyperframes",
    });
    expect(explicitRoute.reason).toBe(
      "Explicit workflow selected: existing-video-recut",
    );

    const shortsRoute = routeVideoJob(
      makeJob({ workflow: "shorts-repackage", source }),
      { enabled: true },
    );
    expect(shortsRoute).toMatchObject({
      workflow: "shorts-repackage",
      primary_agent: "shorts-repackage-producer",
      renderer: "hyperframes",
      provider_requirements: [],
      delegated_capabilities: [],
    });
  });

  it.each([
    {
      name: "recut workflow with a non-video source",
      job: makeJob({ workflow: "existing-video-recut" }),
    },
    {
      name: "existing video without a local ref",
      job: makeJob({
        source: {
          type: "existing-video",
          subject: "Empty existing video",
          refs: [],
        },
      }),
    },
    {
      name: "existing video with a digital-human presenter",
      job: makeJob({
        source: {
          type: "existing-video",
          subject: "Existing video with presenter",
          refs: ["episodes/res/video/HeyGen_out.mp4"],
        },
        presenter: { mode: "digital-human", provider: "heygen" },
      }),
    },
    {
      name: "shorts repackage with a digital-human presenter",
      job: makeJob({
        workflow: "shorts-repackage",
        source: {
          type: "existing-video",
          subject: "Approved source",
          refs: ["episodes/res/video/HeyGen_out.mp4"],
        },
        presenter: { mode: "digital-human", provider: "heygen" },
      }),
    },
    {
      name: "shorts repackage over the maximum duration",
      job: makeJob({
        workflow: "shorts-repackage",
        source: {
          type: "existing-video",
          subject: "Approved source",
          refs: ["episodes/res/video/HeyGen_out.mp4"],
        },
        output: { duration_seconds: 61, aspect_ratio: "9:16", language: "zh" },
      }),
    },
    {
      name: "existing video with the wrong explicit workflow",
      job: makeJob({
        workflow: "faceless-explainer",
        source: {
          type: "existing-video",
          subject: "Existing video with wrong workflow",
          refs: ["episodes/res/video/HeyGen_out.mp4"],
        },
      }),
    },
  ])("rejects $name", ({ job }) => {
    expect(videoJobSchema.safeParse(job).success).toBe(false);
  });

  it("rejects Remotion for existing-video recut and shorts-repackage routes", () => {
    const source = {
      type: "existing-video",
      subject: "Existing video with wrong renderer",
      refs: ["episodes/res/video/HeyGen_out.mp4"],
    };

    for (const workflow of ["auto", "shorts-repackage"] as const) {
      expect(() =>
        routeVideoJob(
          makeJob({ source, workflow, render: { engine: "remotion" } }),
          { enabled: true },
        ),
      ).toThrow(/requires renderer hyperframes/);
    }
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

  it("ships a host-neutral entry package, Devin adapter, and twelve specialist profiles", () => {
    const skill = readProjectFile(".devin/skills/video-producer/SKILL.md");
    const neutralEntry = readProjectFile("agents/video-producer/AGENT.md");
    const specialistMap = readProjectFile("agents/video-producer/SPECIALISTS.md");
    const specialists = [
      "product-promo-producer",
      "digital-human-producer",
      "faceless-explainer-producer",
      "existing-video-recut-producer",
      "shorts-repackage-producer",
      "embedded-captions-producer",
      "pr-video-producer",
      "music-video-producer",
      "video-translation-producer",
      "motion-graphics-producer",
      "slideshow-producer",
      "remotion-port-producer",
    ] as const;

    expect(readFrontmatter(".devin/skills/video-producer/SKILL.md")).toMatchObject({
      name: "video-producer",
      triggers: ["user", "model"],
    });
    expect(skill).toContain("agents/video-producer/AGENT.md");
    expect(neutralEntry).not.toMatch(/^---/);
    expect(neutralEntry).toContain("npm run video:route");
    expect(neutralEntry).toContain("FLAGS.VIDEO_AGENT_PLATFORM");
    expect(neutralEntry).toContain("exactly one primary");
    expect(neutralEntry).toContain("needs_approval");
    expect(neutralEntry).toContain('"status": "done | needs_approval | blocked | failed"');
    expect(readProjectFile("agents/video-producer/README.md")).toContain(
      "No global installation",
    );

    for (const name of specialists) {
      const body = readProjectFile(`.devin/agents/${name}.md`);
      expect(readFrontmatter(`.devin/agents/${name}.md`)).toMatchObject({
        name,
      });
      expect(body).toContain("needs_approval");
      expect(specialistMap).toContain(`| ${name.replace("-producer", "")} | ${name} |`);
      expect(specialistMap).toContain(`.devin/agents/${name}.md`);
    }

    expect(
      readProjectFile(".devin/agents/existing-video-recut-producer.md"),
    ).toContain("talking-head-recut");
    expect(
      readProjectFile(
        ".devin/agents/existing-video-recut-producer.md",
      ).toLowerCase(),
    ).toContain("source immutability");
    expect(
      readProjectFile(
        ".devin/agents/shorts-repackage-producer.md",
      ).toLowerCase(),
    ).toContain("source video");
    expect(
      readProjectFile(".devin/agents/embedded-captions-producer.md"),
    ).toContain("embedded-captions");
    expect(
      readProjectFile(".devin/agents/video-translation-producer.md"),
    ).toMatch(/paid|heygen/i);
  });

  it("rejects translation without provider and captions/recut source mismatches", () => {
    expect(() =>
      videoJobSchema.parse(
        makeJob({
          workflow: "video-translation",
          source: {
            type: "existing-video",
            subject: "translate",
            refs: ["episodes/res/video/HeyGen_out.mp4"],
          },
          presenter: { mode: "none" },
        }),
      ),
    ).toThrow(/presenter\.provider/);

    expect(() =>
      videoJobSchema.parse(
        makeJob({
          workflow: "embedded-captions",
          source: {
            type: "topic",
            subject: "not a video",
            refs: [],
          },
        }),
      ),
    ).toThrow(/existing-video/);

    expect(() =>
      videoJobSchema.parse(
        makeJob({
          workflow: "pr-video",
          source: {
            type: "github-pr",
            subject: "missing ref",
            refs: [],
          },
        }),
      ),
    ).toThrow(/ref/);
  });

  it("keeps dev and prod kill-switch keys in parity", () => {
    const dev = readProjectFile("config/.env.dev.example");
    const prod = readProjectFile("config/.env.prod.example");

    expect(dev).toContain('FLAG_video_agent_platform={"enabled":false}');
    expect(prod).toContain('FLAG_video_agent_platform={"enabled":false}');
  });
});
