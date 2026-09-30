import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { getMediaAssetPublicVisibilityState } from "../../../utils/adminMediaFormUtils";
import { FieldShell, SelectInput } from "./AdminMediaFormControls";
import { AdminMediaFormSection } from "./AdminMediaFormSection";

interface AdminMediaStatusFieldsProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

const visibilityLabels = {
  public: "Public",
  not_public: "Not Public",
  needs_required_fields: "Needs Required Fields",
  owner_not_public: "Owner Not Public",
};

export function AdminMediaStatusFields({ state, validation, selectedArtist, selectedRelease, updateField }: AdminMediaStatusFieldsProps) {
  const visibility = getMediaAssetPublicVisibilityState(
    state,
    state.ownerType === "artist" ? selectedArtist : null,
    state.ownerType === "release" ? selectedRelease : null,
  );

  return (
    <AdminMediaFormSection title="Publishing Status" description="Public surfaces should only use published, safe assets connected to public-safe owners.">
      <FieldShell label="Status" htmlFor="media-status" error={validation.errors.status}>
        <SelectInput
          id="media-status"
          value={state.status}
          onChange={(event) => updateField("status", event.target.value as AdminMediaFormState["status"])}
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
    </AdminMediaFormSection>
  );
}
