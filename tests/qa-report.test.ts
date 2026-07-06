import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateQaReport, renderQaReportMarkdown } from "../src/qa/report";

const sampleEpisodeDir = path.join(process.cwd(), "episodes", "sample");

describe("QA report", () => {
  it("checks rendered output, captions, frame stills, and known limitations", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "ai-remotion-qa-"));

    try {
      cpSync(sampleEpisodeDir, tempDir, { recursive: true });
      mkdirSync(path.join(tempDir, "out", "qa-frames"), { recursive: true });
      writeFileSync(path.join(tempDir, "out", "final.mp4"), Buffer.alloc(4096, 1));
      writeFileSync(
        path.join(tempDir, "out", "qa-frames", "first.png"),
        Buffer.alloc(4096, 1),
      );
      writeFileSync(
        path.join(tempDir, "out", "qa-frames", "middle.png"),
        Buffer.alloc(4096, 1),
      );
      writeFileSync(
        path.join(tempDir, "out", "qa-frames", "final.png"),
        Buffer.alloc(4096, 1),
      );

      const report = generateQaReport({ episodeDir: tempDir });
      const markdown = renderQaReportMarkdown(report);

      expect(report.checks.find((check) => check.id === "video-file")?.status).toBe(
        "pass",
      );
      expect(report.checks.find((check) => check.id === "frame-stills")?.status).toBe(
        "pass",
      );
      expect(markdown).toContain("# QA Report");
      expect(markdown).toContain("Known Limitations");
    } finally {
      rmSync(tempDir, { force: true, recursive: true });
    }
  });
});
