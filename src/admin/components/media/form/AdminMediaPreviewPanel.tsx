import { FileAudio2, FileQuestion, Link as LinkIcon } from "lucide-react";
import type { ArtistAdminRecord, MediaAssetRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminMediaFormState } from "../../../utils/adminMediaFormUtils";
import { getMediaAssetPublicVisibilityState, mediaAssetTypeLabels } from "../../../utils/adminMediaFormUtils";
import { Badge } from "../../../../components/ui/Badge";
import { Card } from "../../../../components/ui/Card";
import { AdminMediaPreviewFrame } from "../AdminMediaPreviewFrame";

interface AdminMediaPreviewPanelProps {
  state: AdminMediaFormState;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  isDirty: boolean;
}

const visibilityCopy = {
  public: "Public",
  not_public: "Not Public",
  needs_required_fields: "Needs Fields",
  owner_not_public: "Owner Not Public",
};

const toPreviewAsset = (state: AdminMediaFormState): MediaAssetRecord => ({
  assetId: state.assetId ?? "preview-asset",
  ownerType: state.ownerType,
  ownerId: state.ownerId,
  assetType: state.assetType,
  title: state.title || "Untitled media asset",
  description: state.description || undefined,
  url: state.url,
  thumbnailUrl: state.thumbnailUrl || undefined,
  largeUrl: state.largeUrl || undefined,
  altText: state.altText || undefined,
  credit: state.credit || undefined,
  status: state.status,
  sortOrder: state.sortOrder ? Number(state.sortOrder) : undefined,
});

export function AdminMediaPreviewPanel({ state, selectedArtist, selectedRelease, isDirty }: AdminMediaPreviewPanelProps) {
  const visibility = getMediaAssetPublicVisibilityState(
    state,
    state.ownerType === "artist" ? selectedArtist : null,
    state.ownerType === "release" ? selectedRelease : null,
  );
  const previewAsset = toPreviewAsset(state);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Preview Panel</h2>
        {isDirty ? <Badge variant="sunrise">Unsaved</Badge> : <Badge variant="neutral">Saved</Badge>}
      </div>
      <div className="mt-5">
        <AdminMediaPreviewFrame asset={previewAsset} compact />
      </div>
      <div className="mt-5 grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Asset</p>
          <p className="mt-1 text-2xl font-semibold text-white">{state.title || "Untitled media asset"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={visibility === "public" ? "glass" : "sunrise"} className={visibility === "public" ? "text-anm-success" : undefined}>
            {visibilityCopy[visibility]}
          </Badge>
          <Badge variant="neutral">{state.status}</Badge>
          <Badge variant="glass">{mediaAssetTypeLabels[state.assetType]}</Badge>
        </div>
        <p className="flex items-center gap-2 break-all text-sm text-white/58">
          {state.assetType === "audio_preview" ? <FileAudio2 className="h-4 w-4 text-white/34" aria-hidden /> : state.url ? <LinkIcon className="h-4 w-4 text-white/34" aria-hidden /> : <FileQuestion className="h-4 w-4 text-white/34" aria-hidden />}
          {state.url || "Missing asset URL"}
        </p>
      </div>
    </Card>
  );
}
