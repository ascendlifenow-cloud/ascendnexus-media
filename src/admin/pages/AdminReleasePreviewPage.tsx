import { useParams } from "react-router-dom";
import { ExternalLinksPanel } from "../../components/links";
import { MoreFromArtistSection } from "../../components/MoreFromArtistSection";
import { SongAudioPreview } from "../../components/SongAudioPreview";
import { SongHero } from "../../components/SongHero";
import { SongInfoPanel } from "../../components/SongInfoPanel";
import { SongLyricsSection } from "../../components/SongLyricsSection";
import { PublicErrorState } from "../../components/fallback";
import { PublicPageLoader } from "../../components/loading";
import { AdminPreviewLayout, PreviewReadinessPanel } from "../components/preview";
import { useReleasePreview } from "../hooks/useAdminPreview";

export function AdminReleasePreviewPage() {
  const { releaseId } = useParams();
  const previewQuery = useReleasePreview(releaseId);
  const preview = previewQuery.data?.ok ? previewQuery.data.data : undefined;
  const artistName = preview?.previewArtist?.displayName ?? "Ascend Nexus Media Artist";

  if (previewQuery.isLoading) return <PublicPageLoader />;
  if (!preview) {
    return <PublicErrorState title="Release preview unavailable" message="This saved admin release record could not be loaded." />;
  }

  return (
    <AdminPreviewLayout
      entityType="release"
      entityLabel={preview.release.title}
      readiness={preview.readiness}
      backTo={`/admin/releases/${preview.release.releaseId}/edit`}
      backLabel="Back to Release"
    >
      <section className="border-b border-white/10 bg-[#10091b] py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <PreviewReadinessPanel readiness={preview.readiness} />
        </div>
      </section>
      <SongHero
        song={preview.previewRelease}
        artist={preview.previewArtist}
        onPlayPreview={() => document.getElementById("audio-preview")?.scrollIntoView({ behavior: "smooth" })}
      />
      <SongInfoPanel song={preview.previewRelease} artist={preview.previewArtist} />
      <SongAudioPreview song={preview.previewRelease} artistName={artistName} />
      <ExternalLinksPanel
        links={preview.previewRelease.externalLinks}
        title="Streaming and Social Links"
        contextLabel={preview.previewRelease.title}
      />
      <SongLyricsSection lyrics={preview.release.lyrics ?? preview.release.description ?? preview.release.featuredDescription} />
      <MoreFromArtistSection artist={preview.previewArtist} releases={preview.moreFromArtist} />
    </AdminPreviewLayout>
  );
}
