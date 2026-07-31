import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const episodeDir = path.resolve("episodes/deepdog-promo");

describe("deepdog promo captions", () => {
  it.each(["hyperframes", "hyperframes-effects"])(
    "%s uses the HeyGen sentence timestamps instead of scene boundaries",
    (composition) => {
    const html = readFileSync(
      path.join(episodeDir, composition, "index.html"),
      "utf8",
    );
    const narration = JSON.parse(
      readFileSync(path.join(episodeDir, "narration.json"), "utf8"),
    ) as { text: string };
    const timing = JSON.parse(
      readFileSync(path.join(episodeDir, "audio/heygen-tts.json"), "utf8"),
    ) as {
      word_timestamps: Array<{ end: number; start: number; word: string }>;
    };
    const words = timing.word_timestamps.filter(
      ({ word }) => !word.startsWith("<"),
    );
    const spoken = words.map(({ word }) => word).join("").replace(/\s+/gu, "");
    const sentences =
      narration.text.replace(/\s+/gu, "").match(/[^。！？]+[。！？]?/gu) ?? [];
    let cursor = 0;
    const expected = sentences.map((text) => {
      const startIndex = spoken.indexOf(text, cursor);
      expect(startIndex).toBeGreaterThanOrEqual(0);
      const endIndex = startIndex + text.length - 1;
      cursor = endIndex + 1;
      return {
        end: words[endIndex].end,
        start: words[startIndex].start,
        text,
      };
    });
    const actual = Array.from(
      html.matchAll(
        /\{\s*start:([\d.]+),\s*end:([\d.]+),\s*text:"([^"]+)"\s*\}/gu,
      ),
      ([, start, end, text]) => ({
        end: Number(end),
        start: Number(start),
        text: text.replaceAll(" ", ""),
      }),
    );

    expect(actual).toEqual(
      expected.map((caption) => ({
        ...caption,
        text: caption.text.replaceAll(" ", ""),
      })),
    );
    expect(html).toContain(".scene > .caption { display:none; }");
    },
  );

  it("keeps the effects cut deterministic", () => {
    const html = readFileSync(
      path.join(episodeDir, "hyperframes-effects/index.html"),
      "utf8",
    );

    expect(html).toContain('data-composition-id="deepdog-promo-effects"');
    expect(html).toContain('class="fx-shutters"');
    expect(html).toContain('class="fx-orbit"');
    expect(html).toContain('class="fx-spectrum"');
    expect(html).toContain('.fromTo(".fx-flash"');
    expect(html).not.toContain("Math.random");
  });
});
