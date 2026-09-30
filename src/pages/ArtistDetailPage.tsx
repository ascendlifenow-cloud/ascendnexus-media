import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ArtistBioSection } from "../components/ArtistBioSection";
import { ArtistExternalLinks } from "../components/ArtistExternalLinks";
import { ArtistFeaturedSong } from "../components/ArtistFeaturedSong";
import { ArtistHero } from "../components/ArtistHero";
import { ArtistReleaseGrid } from "../components/ArtistReleaseGrid";
import { ArtistStyleIdentity } from "../components/ArtistStyleIdentity";
import { ArtistUnavailableState } from "../components/ArtistUnavailableState";
import { BackToArtistsCTA } from "../components/BackToArtistsCTA";
import { ArtistCardSkeleton, GridSkeleton, SectionLoadingSkeleton } from "../components/loading";
import { PageShell } from "../components/layout/PageShell";
import { PublicPageMetadata } from "../components/metadata/PublicPageMetadata";
import { useAnalytics } from "../hooks/useAnalytics";
import { useArtistDetail } from "../hooks/useArtistDetail";
import {
  getArtistFeaturedRelease,
  getArtistGenresFromReleases,
  getArtistStyleTagsFromReleases,
} from "../utils/publicDataSelectors";
import { buildArtistSeoMetadata, routeSeoMetadata } from "../utils/seoMetadata";
import { buildArtistSocialMetadata } from "../utils/socialShareMetadata";

export function ArtistDetailPage() {
  const analytics = useAnalytics();
  const location = useLocation();
  const { artistSlug } = useParams();
  const trackedArtistId = useRef<string | undefined>(undefined);
  const trackedErrorSlug = useRef<string | undefined>(undefined);
  const { artist, releases, isLoading, isError, unavailable } = useArtistDetail();
  const latestRelease = getArtistFeaturedRelease(artist?.artistId, releases);
  const genres = getArtistGenresFromReleases(artist?.artistId, releases);
  const styleTags = getArtistStyleTagsFromReleases(artist?.artistId, releases);

  const scrollToSongs = () => {
    document.getElementById("latest-releases")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!artist || trackedArtistId.current === artist.artistId) return;
    trackedArtistId.current = artist.artistId;
    void analytics.trackArtistView(artist);
  }, [analytics, artist]);

  useEffect(() => {
    if ((!isError && !unavailable) || trackedErrorSlug.current === artistSlug) return;
    trackedErrorSlug.current = artistSlug;
    void analytics.trackErrorState(isError ? "artist_load_error" : "artist_unavailable", location.pathname, {
      entitySlug: artistSlug ?? null,
    });
  }, [analytics, artistSlug, isError, location.pathname, unavailable]);

  return (
    <PageShell>
      <PublicPageMetadata
        path={location.pathname}
        fallbackMetadata={isLoading ? routeSeoMetadata.artists : buildArtistSeoMetadata(unavailable ? undefined : artist)}
        fallbackSocialMetadata={isLoading ? undefined : buildArtistSocialMetadata(unavailable ? undefined : artist)}
      />
      {isLoading ? (
        <>
          <section className="mx-auto max-w-7xl px-4 pb-10 pt-32 sm:px-6 lg:px-8">
            <ArtistCardSkeleton variant="featured" />
          </section>
          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <SectionLoadingSkeleton rows={3} cards={0} />
            <div className="mt-8">
              <GridSkeleton variant="song" itemCount={3} />
            </div>
          </section>
        </>
      ) : null}
      {isError || unavailable ? <ArtistUnavailableState /> : null}
      {artist ? (
        <>
          <ArtistHero artist={artist} latestRelease={latestRelease} genres={genres} onViewSongs={scrollToSongs} />
          <ArtistBioSection artist={artist} />
          <ArtistFeaturedSong release={latestRelease} artist={artist} />
          <ArtistReleaseGrid artist={artist} releases={releases} />
          <ArtistStyleIdentity genres={genres} styleTags={styleTags} musicStyle={artist.musicStyle} />
          <ArtistExternalLinks links={artist.externalLinks} artistName={artist.displayName} />
          <BackToArtistsCTA />
        </>
      ) : null}
    </PageShell>
  );
}
