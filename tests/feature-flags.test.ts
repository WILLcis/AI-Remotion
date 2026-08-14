import { describe, expect, it } from "vitest";
import { FLAGS, LocalProvider } from "../flags/feature-flags";

describe("digital human feature flags", () => {
  it("keeps voice cloning and talking avatars disabled by the kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.TALKING_AVATAR]: { enabled: false },
      [FLAGS.VOICE_CLONE]: { enabled: false },
    });

    await expect(provider.isEnabled(FLAGS.VOICE_CLONE, {}, true)).resolves.toBe(false);
    await expect(provider.isEnabled(FLAGS.TALKING_AVATAR, {}, true)).resolves.toBe(
      false,
    );
  });

  it("keeps the paid Seedance presenter behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.SEEDANCE_PRESENTER]: { enabled: false },
    });

    await expect(provider.isEnabled(FLAGS.SEEDANCE_PRESENTER, {}, true)).resolves.toBe(
      false,
    );
  });

  it("keeps LatentSync lip-sync behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.LATENTSYNC_LIPSYNC]: { enabled: false },
    });

    await expect(provider.isEnabled(FLAGS.LATENTSYNC_LIPSYNC, {}, true)).resolves.toBe(
      false,
    );
  });

  it("keeps InfiniteTalk avatar generation behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.INFINITETALK_AVATAR]: { enabled: false },
    });

    await expect(
      provider.isEnabled(FLAGS.INFINITETALK_AVATAR, {}, true),
    ).resolves.toBe(false);
  });

  it("keeps LongCat avatar generation behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.LONGCAT_AVATAR]: { enabled: false },
    });

    await expect(
      provider.isEnabled(FLAGS.LONGCAT_AVATAR, {}, true),
    ).resolves.toBe(false);
  });

  it("keeps paid HeyGen avatar generation behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.HEYGEN_AVATAR]: { enabled: false },
    });

    await expect(
      provider.isEnabled(FLAGS.HEYGEN_AVATAR, {}, true),
    ).resolves.toBe(false);
  });

  it("keeps Dreamina / 即梦 media behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.DREAMINA_MEDIA]: { enabled: false },
    });

    await expect(
      provider.isEnabled(FLAGS.DREAMINA_MEDIA, {}, true),
    ).resolves.toBe(false);
  });

  it("keeps multi-platform publish behind its kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_PUBLISH]: { enabled: false },
    });

    await expect(provider.isEnabled(FLAGS.VIDEO_PUBLISH, {}, true)).resolves.toBe(
      false,
    );
  });

  it("keeps hotspot digest behind its kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_HOTSPOT]: { enabled: false },
    });
    await expect(provider.isEnabled(FLAGS.VIDEO_HOTSPOT, {}, true)).resolves.toBe(
      false,
    );
  });

  it("keeps the hotspot crawler behind its own kill switch", async () => {
    const provider = new LocalProvider({
      [FLAGS.VIDEO_HOTSPOT_CRAWLER]: { enabled: false },
    });
    await expect(
      provider.isEnabled(FLAGS.VIDEO_HOTSPOT_CRAWLER, {}, true),
    ).resolves.toBe(false);
  });
});
