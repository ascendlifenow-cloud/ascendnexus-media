import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";

export const useArtistDetail = () => {
  const { artistSlug } = useParams();

  const query = useQuery({
    queryKey: ["artist-detail", artistSlug],
    enabled: Boolean(artistSlug),
    queryFn: async () => {
      const artist = await publicMediaApiClient.getArtist(artistSlug ?? "");
      if (!artist) {
        return { artist: undefined, releases: [] };
      }

      const releases = await publicMediaApiClient.getArtistReleases(artist.slug);
      return { artist, releases };
    },
  });

  return {
    ...query,
    artist: query.data?.artist,
    releases: query.data?.releases ?? [],
    unavailable: !query.isLoading && !query.isError && !query.data?.artist,
  };
};
