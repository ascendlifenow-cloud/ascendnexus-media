import type { ArtistAdminRecord } from "../../../../models/admin";
import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { FieldShell, SelectInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseArtistFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  artists: ArtistAdminRecord[];
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

export function AdminReleaseArtistFields({ state, validation, artists, updateField }: AdminReleaseArtistFieldsProps) {
  const selectedArtist = artists.find((artist) => artist.artistId === state.artistId);

  return (
    <AdminReleaseFormSection title="Artist Assignment" description="Connect this release to its Ascend Nexus Media AI Persona Artist.">
      <FieldShell label="Artist" htmlFor="release-artist" error={validation.errors.artistId} required={state.status === "published"}>
        <SelectInput id="release-artist" value={state.artistId} onChange={(event) => updateField("artistId", event.target.value)}>
          <option value="">Select artist</option>
          {artists.map((artist) => (
            <option key={artist.artistId} value={artist.artistId}>
              {artist.displayName} - {artist.status} - {artist.slug}
            </option>
          ))}
        </SelectInput>
      </FieldShell>
      {selectedArtist ? (
        <p className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/58">
          Selected artist: <span className="font-semibold text-white">{selectedArtist.displayName}</span>. Public status:{" "}
          <span className={selectedArtist.status === "active" ? "text-anm-success" : "text-anm-warning"}>{selectedArtist.status}</span>.
        </p>
      ) : (
        <p className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning">
          Missing or unassigned artist releases are not public.
        </p>
      )}
    </AdminReleaseFormSection>
  );
}
