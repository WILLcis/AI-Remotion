import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const templateDir = path.resolve("templates/hyperframes/product-promo");
const sceneIds = ["promo-problem", "promo-feature", "promo-cta"] as const;

describe("HyperFrames product promo template", () => {
  it("keeps the host timeline deterministic and captions independent", () => {
    const html = readFileSync(path.join(templateDir, "index.html"), "utf8");

    expect(html).toContain('data-composition-id="product-promo-template"');
    expect(html).toContain('class="clip caption"');
    expect(html).toContain('window.__timelines["product-promo-template"]');
    expect(html).not.toMatch(/Math\.random|Date\.now|performance\.now/gu);
  });

  it.each(sceneIds)("%s obeys the sub-composition mount contract", (sceneId) => {
    const host = readFileSync(path.join(templateDir, "index.html"), "utf8");
    const scene = readFileSync(
      path.join(templateDir, "compositions", `${sceneId}.html`),
      "utf8",
    );
    const templateStart = scene.indexOf("<template");
    const templateEnd = scene.indexOf("</template>");

    expect(host).toContain(`data-composition-id="${sceneId}"`);
    expect(host).toContain(
      `data-composition-src="compositions/${sceneId}.html"`,
    );
    expect(scene).toContain(`data-composition-id="${sceneId}"`);
    expect(scene).toContain(`window.__timelines["${sceneId}"]`);
    expect(scene.indexOf("<style>")).toBeGreaterThan(templateStart);
    expect(scene.indexOf("<script>")).toBeGreaterThan(templateStart);
    expect(scene.indexOf("<style>")).toBeLessThan(templateEnd);
    expect(scene.indexOf("<script>")).toBeLessThan(templateEnd);
    expect(scene).not.toMatch(/Math\.random|Date\.now|performance\.now/gu);
  });
});
