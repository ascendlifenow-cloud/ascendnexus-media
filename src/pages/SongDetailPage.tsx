import { useEffect, useRef } from "react";
import { useLocation, useParams } from "react-router-dom";
import { AudioPreviewSkeleton, SectionLoadingSkeleton, SongCardSkeleton } from "../components/loading";
import { MoreFromArtistSection } from "../components/MoreFromArtistSection";
import { SongAudioPreview } from "../components/SongAudioPreview";
import { SongBackNavigationCTA } from "../components/SongBackNavigationCTA";
import { SongExternalLinks } from "../components/SongExternalLinks";
import { SongHero } from "../components/SongHero";
import { SongInfoPanel } from "../components/SongInfoPanel";
import { SongLyricsSection } from "../components/SongLyricsSection";
import { SongStyleTags } from "../components/SongStyleTags";
import { SongUnavailableState } from "../components/SongUnavailableState";
import { PageShell } from "../components/layout/PageShell";
import { PublicPageMetadata } from "../components/metadata/PublicPageMetadata";
import { useAnalytics } from "../hooks/useAnalytics";
import { useSongDetail } from "../hooks/useSongDetail";
import { buildDefaultSeoMetadata, buildSongSeoMetadata } from "../utils/seoMetadata";
import { buildSongSocialMetadata } from "../utils/socialShareMetadata";

export function SongDetailPage() {
  const analytics = useAnalytics();
  const location = useLocation();
  const { songSlug } = useParams();
  const trackedReleaseId = useRef<string | undefined>(undefined);
  const trackedErrorSlug = useRef<string | undefined>(undefined);
  const { song, artist, moreReleases, isLoading, isError, unavailable } = useSongDetail();

  const playPreview = () => {
    document.getElementById("audio-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (!song || trackedReleaseId.current === song.releaseId) return;
    trackedReleaseId.current = song.releaseId;
    void analytics.trackSongView(song, artist);
  }, [analytics, artist, song]);

  useEffect(() => {
    if ((!isError && !unavailable) || trackedErrorSlug.current === songSlug) return;
    trackedErrorSlug.current = songSlug;
    void analytics.trackErrorState(isError ? "song_load_error" : "song_unavailable", location.pathname, {
      entitySlug: songSlug ?? null,
    });
  }, [analytics, isError, location.pathname, songSlug, unavailable]);

  return (
    <PageShell>
      <PublicPageMetadata
        path={location.pathname}
        fallbackMetadata={
          isLoading
            ? buildDefaultSeoMetadata({
                title: "Song",
                description: "Explore an Ascend Nexus Media release.",
                type: "song",
              })
            : buildSongSeoMetadata(unavailable ? undefined : song, artist)
        }
        fallbackSocialMetadata={isLoading ? undefined : buildSongSocialMetadata(unavailable ? undefined : song, artist)}
      />
      {isLoading ? (
        <>
          <section className="mx-auto max-w-7xl px-4 pb-10 pt-32 sm:px-6 lg:px-8">
            <SongCardSkeleton variant="featured" />
          </section>
          <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
            <AudioPreviewSkeleton />
            <div className="mt-8">
              <SectionLoadingSkeleton rows={3} cards={0} />
            </div>
          </section>
        </>
      ) : null}
      {isError || unavailable ? <SongUnavailableState /> : null}
      {song ? (
        <>
          <SongHero song={song} artist={artist} onPlayPreview={playPreview} />
          <SongAudioPreview song={song} artistName={artist?.displayName ?? "Ascend Nexus Media Artist"} />
          <SongInfoPanel song={song} artist={artist} />
          <section className="bg-night py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="rounded-lg border border-white/10 bg-white/[0.055] p-6">
                <p className="text-sm font-bold uppercase tracking-[0.24em] text-amberGlow">Style</p>
                <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Genre and tags</h2>
                <div className="mt-5">
                  <SongStyleTags genre={song.genre} styleTags={song.styleTags} />
                </div>
              </div>
            </div>
          </section>
          <SongLyricsSection />
          <SongExternalLinks links={song.externalLinks} songTitle={song.title} />
          <MoreFromArtistSection artist={artist} releases={moreReleases} />
          <SongBackNavigationCTA artist={artist} />
        </>
      ) : null}
    </PageShell>
  );
}
