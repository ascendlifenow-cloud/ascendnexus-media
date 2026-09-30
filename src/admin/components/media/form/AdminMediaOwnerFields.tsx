import type { ArtistAdminRecord, MediaAssetOwnerType, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminMediaFormState, AdminMediaFormValidation } from "../../../utils/adminMediaFormUtils";
import { mediaOwnerTypeLabels } from "../../../utils/adminMediaFormUtils";
import { FieldShell, SelectInput, TextInput } from "./AdminMediaFormControls";
import { AdminMediaFormSection } from "./AdminMediaFormSection";

interface AdminMediaOwnerFieldsProps {
  state: AdminMediaFormState;
  validation: AdminMediaFormValidation;
  artists: ArtistAdminRecord[];
  releases: SongReleaseAdminRecord[];
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  updateField: <K extends keyof AdminMediaFormState>(field: K, value: AdminMediaFormState[K]) => void;
}

const ownerTypes = Object.keys(mediaOwnerTypeLabels) as MediaAssetOwnerType[];

export function AdminMediaOwnerFields({
  state,
  validation,
  artists,
  releases,
  selectedArtist,
  selectedRelease,
  updateField,
}: AdminMediaOwnerFieldsProps) {
  const ownerWarning =
    state.ownerType === "artist" && selectedArtist && selectedArtist.status !== "active"
      ? "Selected artist is not public."
      : state.ownerType === "release" && selectedRelease && selectedRelease.status !== "published"
        ? "Selected release is not public."
        : null;

  return (
    <AdminMediaFormSection title="Owner Assignment" description="Connect this media asset to an artist, release, gallery item, site surface, or custom owner.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Owner Type" htmlFor="media-owner-type" required>
          <SelectInput
            id="media-owner-type"
            value={state.ownerType}
            onChange={(event) => updateField("ownerType", event.target.value as AdminMediaFormState["ownerType"])}
          >
            {ownerTypes.map((ownerType) => (
              <option key={ownerType} value={ownerType}>{mediaOwnerTypeLabels[ownerType]}</option>
            ))}
          </SelectInput>
        </FieldShell>
        {state.ownerType === "artist" ? (
          <FieldShell label="Artist Owner" htmlFor="media-owner-artist" error={validation.errors.ownerId} required={state.status === "published"}>
            <SelectInput id="media-owner-artist" value={state.ownerId} onChange={(event) => updateField("ownerId", event.target.value)}>
              <option value="">Select artist</option>
              {artists.map((artist) => (
                <option key={artist.artistId} value={artist.artistId}>{artist.displayName} - {artist.status}</option>
              ))}
            </SelectInput>
          </FieldShell>
        ) : null}
        {state.ownerType === "release" ? (
          <FieldShell label="Release Owner" htmlFor="media-owner-release" error={validation.errors.ownerId} required={state.status === "published"}>
            <SelectInput id="media-owner-release" value={state.ownerId} onChange={(event) => updateField("ownerId", event.target.value)}>
              <option value="">Select release</option>
              {releases.map((release) => (
                <option key={release.releaseId} value={release.releaseId}>{release.title} - {release.status}</option>
              ))}
            </SelectInput>
          </FieldShell>
        ) : null}
        {state.ownerType === "gallery" || state.ownerType === "custom" ? (
          <FieldShell label="Owner ID" htmlFor="media-owner-id" error={validation.errors.ownerId} required={state.status === "published"}>
            <TextInput id="media-owner-id" value={state.ownerId} onChange={(event) => updateField("ownerId", event.target.value)} />
          </FieldShell>
        ) : null}
        {state.ownerType === "site" ? (
          <FieldShell label="Site Owner ID" htmlFor="media-owner-site" help="Optional. Defaults to site.">
            <TextInput id="media-owner-site" value={state.ownerId} onChange={(event) => updateField("ownerId", event.target.value)} placeholder="site" />
          </FieldShell>
        ) : null}
      </div>
      {ownerWarning ? (
        <p className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning">{ownerWarning}</p>
      ) : null}
    </AdminMediaFormSection>
  );
}
