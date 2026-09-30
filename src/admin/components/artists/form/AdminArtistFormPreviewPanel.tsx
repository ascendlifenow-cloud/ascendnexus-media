import type { AdminArtistFormState } from "../../../utils/adminArtistFormUtils";
import { ArtistBannerImage } from "../../../../components/media/ArtistBannerImage";
import { ArtistProfileImage } from "../../../../components/media/ArtistProfileImage";
import { Badge } from "../../../../components/ui/Badge";
import { getArtistFormPublicVisibilityState } from "../../../utils/adminArtistFormUtils";
import { AdminArtistFormSection } from "./AdminArtistFormSection";

interface AdminArtistFormPreviewPanelProps {
  state: AdminArtistFormState;
  isDirty: boolean;
}

export function AdminArtistFormPreviewPanel({ state, isDirty }: AdminArtistFormPreviewPanelProps) {
  const visibility = getArtistFormPublicVisibilityState(state);
  const visibilityLabel = visibility === "public" ? "Public" : visibility === "needs_required_fields" ? "Needs Required Fields" : "Not Public";

  return (
    <AdminArtistFormSection title="Preview" description="Public profile readiness preview.">
      <div className="grid gap-4">
        {state.profileBannerUrl.trim() ? (
          <ArtistBannerImage
            src={state.profileBannerUrl}
            artistName={state.name || state.displayName || "New Artist"}
            displayName={state.displayName || state.name || "New Artist"}
          />
        ) : null}
        <ArtistProfileImage
          src={state.profileImage}
          artistName={state.name || state.displayName || "New Artist"}
          displayName={state.displayName || state.name || "New Artist"}
          fallbackVariant="minimal"
        />
        {state.characterArtUrl.trim() ? (
          <ArtistProfileImage
            src={state.characterArtUrl}
            artistName={state.name || state.displayName || "New Artist"}
            displayName={`${state.displayName || state.name || "New Artist"} character art`}
            fallbackVariant="minimal"
          />
        ) : null}
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={visibility === "public" ? "pink" : "sunrise"}>{visibilityLabel}</Badge>
            {isDirty ? <Badge variant="neutral">Unsaved Changes</Badge> : null}
          </div>
          <h2 className="mt-3 text-2xl font-semibold text-white">{state.displayName || "Untitled Artist"}</h2>
          <p className="mt-2 text-sm leading-6 text-white/62">{state.shortBio || state.bio || "No public bio has been added yet."}</p>
          <p className="mt-2 text-xs text-white/42">/{state.slug || "missing-slug"}</p>
        </div>
      </div>
    </AdminArtistFormSection>
  );
}
