import { useQuery } from "@tanstack/react-query";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";

export const useFeaturedReleases = () =>
  useQuery({
    queryKey: ["releases", "featured"],
    queryFn: () => publicMediaApiClient.getFeaturedReleases(),
  });

export const useHomepageFeaturedRelease = () =>
  useQuery({
    queryKey: ["releases", "featured", "homepage", "primary"],
    queryFn: async () => {
      const [featured, artists] = await Promise.all([publicMediaApiClient.getFeaturedReleases(), publicMediaApiClient.listArtists()]);
      const release = featured[0];
      const artist = release ? artists.find((item) => item.artistId === release.artistId) : undefined;
      return release && artist ? { release, artist } : undefined;
    },
  });

export const useArtistFeaturedRelease = (artistId: string | undefined) =>
  useQuery({
    queryKey: ["releases", "featured", "artist", artistId],
    enabled: Boolean(artistId),
    queryFn: async () => (await publicMediaApiClient.getFeaturedReleases()).find((release) => release.artistId === artistId),
  });
