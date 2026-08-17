import { existsSync } from "node:fs";
import path from "node:path";
import { resolveAudioTranscript } from "./cloneVoice";

/** Creator-authorized default identity. Approved look: hotspot-20260816-identity-v4. */
export const DEFAULT_HOTSPOT_PHOTO_REL = "episodes/res/img/dh1.jpg";
export const DEFAULT_HOTSPOT_AUDIO_REL = "episodes/res/audio/dg1.wav";
export const DEFAULT_HOTSPOT_APPROVED_CLIP_REL =
  "videos/hotspot-20260816-identity-v4/renders/clip-01/c1b2f30b-807e-461b-ba70-c3e1411f6ccf_video_1.mp4";

export type HotspotIdentityPaths = {
  photo_path?: string;
  audio_path?: string;
  audio_transcript?: string;
};

export const resolveHotspotIdentity = (input: {
  cwd?: string;
  photoPath?: string;
  audioPath?: string;
  audioTranscript?: string;
  applyDefault?: boolean;
}): HotspotIdentityPaths => {
  const cwd = input.cwd ?? process.cwd();
  const explicitPhoto = input.photoPath?.trim();
  const explicitAudio = input.audioPath?.trim();
  const useDefault = Boolean(input.applyDefault) && !explicitPhoto && !explicitAudio;
  const photo = explicitPhoto
    ? path.resolve(explicitPhoto)
    : useDefault
      ? path.resolve(cwd, DEFAULT_HOTSPOT_PHOTO_REL)
      : undefined;
  const audio = explicitAudio
    ? path.resolve(explicitAudio)
    : useDefault
      ? path.resolve(cwd, DEFAULT_HOTSPOT_AUDIO_REL)
      : undefined;
  if (useDefault && (!photo || !audio || !existsSync(photo) || !existsSync(audio))) {
    return {};
  }
  const transcript = audio
    ? resolveAudioTranscript(audio, input.audioTranscript)
    : undefined;
  return {
    ...(photo ? { photo_path: photo } : {}),
    ...(audio ? { audio_path: audio } : {}),
    ...(transcript ? { audio_transcript: transcript } : {}),
  };
};
