import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, TextArea, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseDetailsFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseDetailsFields({ state, validation, updateField }: AdminReleaseDetailsFieldsProps) {
  return (
    <AdminReleaseFormSection title="Release Details" description="Release date, genre, and public description foundation.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Release Date" htmlFor="release-date" error={validation.errors.releaseDate} required={state.status === "published"}>
          <TextInput id="release-date" type="date" value={state.releaseDate} onChange={(event) => updateField("releaseDate", event.target.value)} />
        </FieldShell>
        <FieldShell label="Genre" htmlFor="release-genre" help="Recommended for public browsing and filtering.">
          <TextInput id="release-genre" value={state.genre} onChange={(event) => updateField("genre", event.target.value)} placeholder="Pop" />
        </FieldShell>
      </div>
      <FieldShell label="Description" htmlFor="release-description" help="Future-ready public song detail copy.">
        <TextArea
          id="release-description"
          value={state.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="Short editorial description for the release."
        />
      </FieldShell>
    </AdminReleaseFormSection>
  );
}
