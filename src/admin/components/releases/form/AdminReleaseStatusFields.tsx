import type { ArtistAdminRecord } from "../../../../models/admin";
import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { getReleasePublicVisibilityState } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, SelectInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseStatusFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  artist: ArtistAdminRecord | null;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

const visibilityLabels = {
  public: "Public",
  not_public: "Not Public",
  needs_required_fields: "Needs Required Fields",
  artist_not_public: "Artist Not Public",
};

export function AdminReleaseStatusFields({ state, validation, artist, updateField }: AdminReleaseStatusFieldsProps) {
  const visibility = getReleasePublicVisibilityState(state, artist);

  return (
    <AdminReleaseFormSection title="Publishing Status" description="Public pages continue to show only published releases linked to active artists.">
      <FieldShell label="Status" htmlFor="release-status" error={validation.errors.status}>
        <SelectInput
          id="release-status"
          value={state.status}
          onChange={(event) => updateField("status", event.target.value as AdminReleaseFormState["status"])}
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
    </AdminReleaseFormSection>
  );
}
