import type { ArtistAdminRecord, MediaAssetRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { getGalleryItemPublicVisibilityState } from "../../../utils/adminGalleryFormUtils";
import { FieldShell, SelectInput } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGalleryStatusFieldsProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  selectedMediaAsset: MediaAssetRecord | null;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

const visibilityLabels = {
  public: "Public",
  not_public: "Not Public",
  needs_required_fields: "Needs Required Fields",
  source_not_public: "Source Not Public",
  missing_image: "Missing Image",
};

export function AdminGalleryStatusFields({
  state,
  validation,
  selectedMediaAsset,
  selectedArtist,
  selectedRelease,
  updateField,
}: AdminGalleryStatusFieldsProps) {
  const visibility = getGalleryItemPublicVisibilityState(
    state,
    selectedMediaAsset,
    state.sourceType === "artist" ? selectedArtist : null,
    state.sourceType === "release" ? selectedRelease : null,
  );

  return (
    <AdminGalleryFormSection title="Publishing Status" description="Public gallery display remains limited to published, image-safe, source-safe items.">
      <FieldShell label="Status" htmlFor="gallery-status" error={validation.errors.status}>
        <SelectInput
          id="gallery-status"
          value={state.status}
          onChange={(event) => updateField("status", event.target.value as AdminGalleryFormState["status"])}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </SelectInput>
      </FieldShell>
      <div className="rounded-md border border-white/10 bg-black/20 px-3 py-3">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/48">Public Visibility</p>
        <p className={visibility === "public" ? "mt-1 text-lg font-semibold text-anm-success" : "mt-1 text-lg font-semibold text-anm-warning"}>
          {visibilityLabels[visibility]}
        </p>
      </div>
    </AdminGalleryFormSection>
  );
}
