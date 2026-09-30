import { Calendar, Music, RadioTower, Tags } from "lucide-react";
import type { ArtistAdminRecord } from "../../../../models/admin";
import type { AdminReleaseFormState } from "../../../utils/adminReleaseFormUtils";
import { getReleasePublicVisibilityState } from "../../../utils/adminReleaseFormUtils";
import { Badge } from "../../../../components/ui/Badge";
import { Card } from "../../../../components/ui/Card";
import { CoverArtImage } from "../../../../components/media/CoverArtImage";

interface AdminReleaseFormPreviewPanelProps {
  state: AdminReleaseFormState;
  artist: ArtistAdminRecord | null;
  isDirty: boolean;
}

const visibilityCopy = {
  public: "Public",
  not_public: "Not Public",
  needs_required_fields: "Needs Fields",
  artist_not_public: "Artist Not Public",
};

export function AdminReleaseFormPreviewPanel({ state, artist, isDirty }: AdminReleaseFormPreviewPanelProps) {
  const visibility = getReleasePublicVisibilityState(state, artist);
  const artistName = artist?.displayName ?? "Unassigned artist";
  const tags = state.styleTagsInput.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 5);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Release Preview</h2>
        {isDirty ? <Badge variant="sunrise">Unsaved</Badge> : <Badge variant="neutral">Saved</Badge>}
      </div>
      <div className="mt-5">
        <CoverArtImage src={state.coverArtUrl} alt={state.coverArtAlt || undefined} title={state.title || "Untitled release"} artistName={artistName} size="card" priority />
      </div>
      <div className="mt-5 grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/42">Title</p>
          <p className="mt-1 text-2xl font-semibold text-white">{state.title || "Untitled release"}</p>
        </div>
        <p className="text-sm text-white/58">{artistName}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant={visibility === "public" ? "glass" : "sunrise"} className={visibility === "public" ? "text-anm-success" : undefined}>
            <RadioTower className="h-3.5 w-3.5" aria-hidden />
            {visibilityCopy[visibility]}
          </Badge>
          <Badge variant="neutral">
            <Music className="h-3.5 w-3.5" aria-hidden />
            {state.status}
          </Badge>
        </div>
        <div className="grid gap-2 text-sm text-white/58">
          <p className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-white/34" aria-hidden />
            {state.releaseDate || "No release date"}
          </p>
          <p className="flex items-center gap-2">
            <Tags className="h-4 w-4 text-white/34" aria-hidden />
            {state.genre || "No genre"}
          </p>
        </div>
        {tags.length ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => <Badge key={tag} variant="glass">{tag}</Badge>)}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
