import { ImageIcon, Link as LinkIcon } from "lucide-react";
import type { ArtistAdminRecord, MediaAssetRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminGalleryFormState } from "../../../utils/adminGalleryFormUtils";
import {
  galleryMediaTypeLabels,
  gallerySourceTypeLabels,
  getGalleryItemPublicVisibilityState,
  getSelectedMediaAssetImageUrl,
} from "../../../utils/adminGalleryFormUtils";
import { Badge } from "../../../../components/ui/Badge";
import { Card } from "../../../../components/ui/Card";
import { ArtistProfileImage } from "../../../../components/media/ArtistProfileImage";
import { CoverArtImage } from "../../../../components/media/CoverArtImage";

interface AdminGalleryPreviewPanelProps {
  state: AdminGalleryFormState;
  selectedMediaAsset: MediaAssetRecord | null;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  isDirty: boolean;
}

const visibilityCopy = {
  public: "Public",
  not_public: "Not Public",
  needs_required_fields: "Needs Fields",
  source_not_public: "Source Not Public",
  missing_image: "Missing Image",
};

export function AdminGalleryPreviewPanel({
  state,
  selectedMediaAsset,
  selectedArtist,
  selectedRelease,
  isDirty,
}: AdminGalleryPreviewPanelProps) {
  const imageUrl = getSelectedMediaAssetImageUrl(state, selectedMediaAsset);
  const visibility = getGalleryItemPublicVisibilityState(
    state,
    selectedMediaAsset,
    state.sourceType === "artist" ? selectedArtist : null,
    state.sourceType === "release" ? selectedRelease : null,
  );
  const sourceSummary =
    state.sourceType === "artist"
      ? selectedArtist?.displayName ?? "Unselected artist"
      : state.sourceType === "release"
        ? selectedRelease?.title ?? "Unselected release"
        : state.sourceId || "Manual source";

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Gallery Preview</h2>
        {isDirty ? <Badge variant="sunrise">Unsaved</Badge> : <Badge variant="neutral">Saved</Badge>}
      </div>
      <div className="mt-5">
        {state.mediaType === "artist_profile" ? (
          <ArtistProfileImage
            src={imageUrl}
            artistName={state.title || "Gallery item"}
            displayName={state.title || "Gallery item"}
            alt={state.altText}
            size="card"
            shape="rounded"
            fallbackVariant="minimal"
          />
        ) : (
          <CoverArtImage
            src={imageUrl}
            title={state.title || "Untitled gallery item"}
            alt={state.altText}
            size="card"
            fallbackVariant="minimal"
          />
        )}
      </div>
      <div className="mt-5 grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Title</p>
          <p className="mt-1 text-2xl font-semibold text-white">{state.title || "Untitled gallery item"}</p>
        </div>
        <p className="text-sm leading-6 text-white/58">{state.description || "No description has been added."}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={visibility === "public" ? "glass" : "sunrise"} className={visibility === "public" ? "text-anm-success" : undefined}>
            {visibilityCopy[visibility]}
          </Badge>
          <Badge variant="glass">{galleryMediaTypeLabels[state.mediaType]}</Badge>
          <Badge variant="neutral">{gallerySourceTypeLabels[state.sourceType]}</Badge>
        </div>
        <p className="flex items-center gap-2 break-all text-sm text-white/58">
          {imageUrl ? <LinkIcon className="h-4 w-4 text-white/34" aria-hidden /> : <ImageIcon className="h-4 w-4 text-white/34" aria-hidden />}
          {imageUrl || "Missing image source"}
        </p>
        <p className="text-sm text-white/58">Source: {sourceSummary}</p>
        <p className="text-sm text-white/58">Alt text: {state.altText || "Missing alt text"}</p>
      </div>
    </Card>
  );
}
