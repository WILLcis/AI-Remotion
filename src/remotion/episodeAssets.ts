export const getEpisodeAssetStaticPath = ({
  assetPath,
  episodeId,
}: {
  assetPath: string;
  episodeId: string;
}): string => `__ai-remotion/${episodeId}/${assetPath}`;
