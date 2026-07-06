import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { type ZodIssue, type ZodType } from "zod";
import {
  type Brief,
  briefSchema,
  type RenderPlan,
  renderPlanSchema,
  type Storyboard,
  storyboardSchema,
} from "./artifacts";

export type EpisodeArtifacts = {
  brief: Brief;
  storyboard: Storyboard;
  renderPlan: RenderPlan;
};

export type ArtifactValidationIssue = {
  artifact: "brief" | "storyboard" | "render-plan";
  file: string;
  path: string;
  message: string;
};

export type EpisodeValidationResult =
  | {
      ok: true;
      artifacts: EpisodeArtifacts;
      issues: [];
    }
  | {
      ok: false;
      issues: ArtifactValidationIssue[];
    };

export class ArtifactValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: ArtifactValidationIssue[],
  ) {
    super(message);
    this.name = "ArtifactValidationError";
  }
}

export const parseBriefFile = (filePath: string): Brief => {
  return parseArtifactFile({
    artifact: "brief",
    filePath,
    parser: YAML.parse,
    schema: briefSchema,
  });
};

export const parseStoryboardFile = (filePath: string): Storyboard => {
  return parseArtifactFile({
    artifact: "storyboard",
    filePath,
    parser: JSON.parse,
    schema: storyboardSchema,
  });
};

export const parseRenderPlanFile = (filePath: string): RenderPlan => {
  return parseArtifactFile({
    artifact: "render-plan",
    filePath,
    parser: JSON.parse,
    schema: renderPlanSchema,
  });
};

export const loadEpisodeArtifacts = (episodeDir: string): EpisodeArtifacts => {
  return {
    brief: parseBriefFile(path.join(episodeDir, "brief.yaml")),
    storyboard: parseStoryboardFile(path.join(episodeDir, "storyboard.json")),
    renderPlan: parseRenderPlanFile(
      path.join(episodeDir, "render-plan.json"),
    ),
  };
};

export const validateEpisodeArtifacts = (
  episodeDir: string,
): EpisodeValidationResult => {
  try {
    return {
      ok: true,
      artifacts: loadEpisodeArtifacts(episodeDir),
      issues: [],
    };
  } catch (error) {
    if (error instanceof ArtifactValidationError) {
      return {
        ok: false,
        issues: error.issues,
      };
    }

    throw error;
  }
};

type ParseArtifactOptions<T> = {
  artifact: ArtifactValidationIssue["artifact"];
  filePath: string;
  parser: (source: string) => unknown;
  schema: ZodType<T>;
};

const parseArtifactFile = <T>({
  artifact,
  filePath,
  parser,
  schema,
}: ParseArtifactOptions<T>): T => {
  let parsed: unknown;

  try {
    parsed = parser(readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new ArtifactValidationError(
      `${artifact} failed to parse: ${message}`,
      [
        {
          artifact,
          file: filePath,
          path: "$",
          message,
        },
      ],
    );
  }

  const result = schema.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  const issues = formatIssues(artifact, filePath, result.error.issues);
  throw new ArtifactValidationError(
    `${artifact} validation failed: ${issues
      .map((issue) => `${issue.path}: ${issue.message}`)
      .join("; ")}`,
    issues,
  );
};

const formatIssues = (
  artifact: ArtifactValidationIssue["artifact"],
  file: string,
  issues: ZodIssue[],
): ArtifactValidationIssue[] => {
  return issues.map((issue) => ({
    artifact,
    file,
    path: issue.path.length > 0 ? issue.path.join(".") : "$",
    message: issue.message,
  }));
};
