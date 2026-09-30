import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { AdminMediaAccessibilityFields } from "./AdminMediaAccessibilityFields";
import { AdminMediaClassificationFields } from "./AdminMediaClassificationFields";
import { AdminMediaIdentityFields } from "./AdminMediaIdentityFields";
import { AdminMediaOwnerFields } from "./AdminMediaOwnerFields";
import { AdminMediaSourceFields } from "./AdminMediaSourceFields";
import { AdminMediaStatusFields } from "./AdminMediaStatusFields";

interface AdminMediaFormProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  artists: ArtistAdminRecord[];
  releases: SongReleaseAdminRecord[];
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  isEditMode: boolean;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

export function AdminMediaForm({
  state,
  validation,
  artists,
  releases,
  selectedArtist,
  selectedRelease,
  isEditMode,
  updateField,
}: AdminMediaFormProps) {
  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
      <AdminMediaIdentityFields state={state} validation={validation} isEditMode={isEditMode} updateField={updateField} />
      <AdminMediaSourceFields state={state} validation={validation} isEditMode={isEditMode} updateField={updateField} />
      <AdminMediaClassificationFields state={state} validation={validation} updateField={updateField} />
      <AdminMediaOwnerFields
        state={state}
        validation={validation}
        artists={artists}
        releases={releases}
        selectedArtist={selectedArtist}
        selectedRelease={selectedRelease}
        updateField={updateField}
      />
      <AdminMediaAccessibilityFields state={state} validation={validation} updateField={updateField} />
      <AdminMediaStatusFields
        state={state}
        validation={validation}
        selectedArtist={selectedArtist}
        selectedRelease={selectedRelease}
        updateField={updateField}
      />
    </form>
  );
}
