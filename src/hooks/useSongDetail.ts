import { publicationRefreshOptions } from "./publicationFreshness";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "react-router-dom";
import { useContext } from "react";
import { publicMediaApiClient } from "../services/public/PublicMediaApiClient";
import { memberSongCatalogApiService } from "../services/member/MemberSongCatalogApiService";
import { MemberPortalContext } from "../member/contexts/MemberPortalContext";

export const useSongDetail = () => {
  const { songSlug } = useParams();
  const portal = useContext(MemberPortalContext);
  const memberScoped = useLocation().pathname.startsWith("/member/");

  const query = useQuery({
    ...publicationRefreshOptions,
    queryKey: memberScoped ? ["member-song-detail", portal?.session.member.memberId, portal?.session.sessionId, portal?.session.member.authorizationVersion, portal?.dashboard.generatedAt, songSlug] : ["song-detail", songSlug],
    enabled: Boolean(songSlug) && (!memberScoped || Boolean(portal?.session.authenticated)),
    queryFn: async () => {
      return (await (memberScoped ? memberSongCatalogApiService.detail(songSlug ?? "") : publicMediaApiClient.getReleaseDetail(songSlug ?? ""))) ?? { song: undefined, artist: undefined, moreReleases: [] };
    },
    staleTime: memberScoped ? 0 : publicationRefreshOptions.staleTime,
    gcTime: memberScoped ? 0 : 5 * 60_000,
  });

  return {
    ...query,
    song: query.data?.song,
    artist: query.data?.artist,
    moreReleases: query.data?.moreReleases ?? [],
    unavailable: !query.isLoading && !query.isError && !query.data?.song,
  };
};
