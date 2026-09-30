import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminGalleryFormState } from "../../../utils/adminGalleryFormUtils";
import { FieldShell, SelectInput, TextArea } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGalleryDisplayFieldsProps {
  state: AdminGalleryFormState;
  artists: ArtistAdminRecord[];
  releases: SongReleaseAdminRecord[];
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

export function AdminGalleryDisplayFields({ state, artists, releases, updateField }: AdminGalleryDisplayFieldsProps) {
  return (
    <AdminGalleryFormSection title="Gallery Display Details" description="Optional public detail copy and future-flexible artist/release associations.">
      <FieldShell label="Description" htmlFor="gallery-description" help="Optional but recommended for public gallery context.">
        <TextArea id="gallery-description" value={state.description} onChange={(event) => updateField("description", event.target.value)} />
      </FieldShell>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Associated Artist" htmlFor="gallery-artist-id">
          <SelectInput id="gallery-artist-id" value={state.artistId} onChange={(event) => updateField("artistId", event.target.value)}>
            <option value="">None</option>
            {artists.map((artist) => (
              <option key={artist.artistId} value={artist.artistId}>{artist.displayName} - {artist.status}</option>
            ))}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Associated Release" htmlFor="gallery-release-id">
          <SelectInput id="gallery-release-id" value={state.releaseId} onChange={(event) => updateField("releaseId", event.target.value)}>
            <option value="">None</option>
            {releases.map((release) => (
              <option key={release.releaseId} value={release.releaseId}>{release.title} - {release.status}</option>
            ))}
          </SelectInput>
        </FieldShell>
      </div>
    </AdminGalleryFormSection>
  );
}
