import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderHyperFrames } from "../src/hyperframes/heygen";

describe("HeyGen HyperFrames", () => {
  it("direct-uploads a bundle, renders it, polls, and writes the result", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hyperframes-"));
    const bundlePath = path.join(directory, "promo.zip");
    const outputPath = path.join(directory, "final.mp4");
    const urls: string[] = [];
    writeFileSync(bundlePath, "zip");
    try {
      const renderId = await renderHyperFrames({
        apiKey: "secret",
        aspectRatio: "16:9",
        bundlePath,
        outputPath,
        request: async (input, init) => {
          urls.push(input);
          if (input.endsWith("/direct-uploads")) return json({ data: { asset_id: "asset-1", upload_headers: {}, upload_url: "https://upload.example.test/asset" } });
          if (input.startsWith("https://upload")) return new Response("", { status: 200 });
          if (input.endsWith("/complete")) return json({ data: { asset_id: "asset-1" } });
          if (input.endsWith("/renders")) {
            expect(JSON.parse(String(init?.body))).toMatchObject({
              aspect_ratio: "16:9",
              fps: 60,
            });
            return json({ data: { render_id: "render-1" } }, 202);
          }
          if (input.endsWith("/renders/render-1")) return json({ data: { status: "completed", video_url: "https://video.example.test/final.mp4" } });
          expect(init?.method).toBe("GET");
          return new Response(Buffer.from("video"));
        },
        sleep: async () => undefined,
        title: "Promo",
      });
      expect(renderId).toBe("render-1");
      expect(existsSync(outputPath)).toBe(true);
      expect(urls).toContain("https://api.heygen.com/v3/hyperframes/renders");
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }, status });
