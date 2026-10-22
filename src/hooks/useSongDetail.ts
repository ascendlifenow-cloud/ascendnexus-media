import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";

export const useSongDetail = () => {
  const { songSlug } = useParams();

  const query = useQuery({
    queryKey: ["song-detail", songSlug],
    enabled: Boolean(songSlug),
    queryFn: async () => {
      return (await publicMediaApiClient.getReleaseDetail(songSlug ?? "")) ?? { song: undefined, artist: undefined, moreReleases: [] };
    },
    staleTime: 5 * 60_000,
  });

  return {
    ...query,
    song: query.data?.song,
    artist: query.data?.artist,
    moreReleases: query.data?.moreReleases ?? [],
    unavailable: !query.isLoading && !query.isError && !query.data?.song,
  };
};
