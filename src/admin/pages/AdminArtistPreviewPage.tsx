import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ArtistBioSection } from "../../components/ArtistBioSection";
import { ArtistHero } from "../../components/ArtistHero";
import { ArtistReleaseGrid } from "../../components/ArtistReleaseGrid";
import { ArtistStyleIdentity } from "../../components/ArtistStyleIdentity";
import { PublicErrorState } from "../../components/fallback";
import { PublicPageLoader } from "../../components/loading";
import { AdminPreviewLayout, PreviewReadinessPanel } from "../components/preview";
import { useArtistPreview } from "../hooks/useAdminPreview";

export function AdminArtistPreviewPage() {
  const { artistId } = useParams();
  const previewQuery = useArtistPreview(artistId);
  const preview = previewQuery.data?.ok ? previewQuery.data.data : undefined;
  const genres = useMemo(() => Array.from(new Set(preview?.releases.map((release) => release.genre).filter(Boolean) ?? [])).sort(), [preview]);
  const styleTags = useMemo(() => Array.from(new Set(preview?.releases.flatMap((release) => release.styleTags).filter(Boolean) ?? [])).sort(), [preview]);

  if (previewQuery.isLoading) return <PublicPageLoader />;
  if (!preview) {
    return <PublicErrorState title="Artist preview unavailable" message="This saved admin artist record could not be loaded." />;
  }

  return (
    <AdminPreviewLayout
      entityType="artist"
      entityLabel={preview.artist.displayName}
      readiness={preview.readiness}
      backTo={`/admin/artists/${preview.artist.artistId}/edit`}
      backLabel="Back to Artist"
    >
      <section className="border-b border-white/10 bg-[#10091b] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PreviewReadinessPanel readiness={preview.readiness} />
        </div>
      </section>
      <ArtistHero
        artist={preview.previewArtist}
        latestRelease={preview.releases[0]}
        genres={genres}
        onViewSongs={() => document.getElementById("latest-releases")?.scrollIntoView({ behavior: "smooth" })}
      />
      <ArtistBioSection artist={preview.previewArtist} />
      <ArtistStyleIdentity genres={genres} styleTags={styleTags} musicStyle={preview.previewArtist.musicStyle} />
      <ArtistReleaseGrid artist={preview.previewArtist} releases={preview.releases} />
    </AdminPreviewLayout>
  );
}
