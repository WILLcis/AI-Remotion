export const getEpisodeVoiceoverStaticPath = ({
  episodeId,
  voiceoverPath,
}: {
  episodeId: string;
  voiceoverPath: string;
}): string => {
  return `__ai-remotion/${episodeId}/${voiceoverPath}`;
};
