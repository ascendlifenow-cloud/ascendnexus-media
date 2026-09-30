import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";

export const useSongDetail = () => {
  const { songSlug } = useParams();

  const query = useQuery({
    queryKey: ["song-detail", songSlug],
    enabled: Boolean(songSlug),
    queryFn: async () => {
      const song = await publicMediaApiClient.getRelease(songSlug ?? "");
      if (!song) {
        return { song: undefined, artist: undefined, moreReleases: [] };
      }

      const [artist, moreReleases] = await Promise.all([
        publicMediaApiClient.listArtists().then((artists) => artists.find((item) => item.artistId === song.artistId)),
        publicMediaApiClient.listReleases({ artistId: song.artistId }).then((releases) => releases.filter((release) => release.releaseId !== song.releaseId).slice(0, 3)),
      ]);

      return { song, artist, moreReleases };
    },
  });

  return {
    ...query,
    song: query.data?.song,
    artist: query.data?.artist,
    moreReleases: query.data?.moreReleases ?? [],
    unavailable: !query.isLoading && !query.isError && !query.data?.song,
  };
};
