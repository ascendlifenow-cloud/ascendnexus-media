import type { ArtistAdminRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { GallerySourceType } from "../../../../models/gallery";
import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { gallerySourceTypeLabels } from "../../../utils/adminGalleryFormUtils";
import { FieldShell, SelectInput, TextInput } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGallerySourceFieldsProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  artists: ArtistAdminRecord[];
  releases: SongReleaseAdminRecord[];
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

const sourceTypes = Object.keys(gallerySourceTypeLabels) as GallerySourceType[];

export function AdminGallerySourceFields({
  state,
  validation,
  artists,
  releases,
  selectedArtist,
  selectedRelease,
  updateField,
}: AdminGallerySourceFieldsProps) {
  const sourceWarning =
    state.sourceType === "artist" && selectedArtist && selectedArtist.status !== "active"
      ? "Selected artist source is not public."
      : state.sourceType === "release" && selectedRelease && selectedRelease.status !== "published"
        ? "Selected release source is not public."
        : null;

  return (
    <AdminGalleryFormSection title="Source Relationship" description="Connect the gallery item to an artist, release, promo, video, or custom source.">
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Source Type" htmlFor="gallery-source-type" required>
          <SelectInput
            id="gallery-source-type"
            value={state.sourceType}
            onChange={(event) => updateField("sourceType", event.target.value as AdminGalleryFormState["sourceType"])}
          >
            {sourceTypes.map((sourceType) => (
              <option key={sourceType} value={sourceType}>{gallerySourceTypeLabels[sourceType]}</option>
            ))}
          </SelectInput>
        </FieldShell>
        {state.sourceType === "artist" ? (
          <FieldShell label="Artist Source" htmlFor="gallery-source-artist" error={validation.errors.sourceId} required={state.status === "published"}>
            <SelectInput id="gallery-source-artist" value={state.sourceId} onChange={(event) => updateField("sourceId", event.target.value)}>
              <option value="">Select artist</option>
              {artists.map((artist) => (
                <option key={artist.artistId} value={artist.artistId}>{artist.displayName} - {artist.status}</option>
              ))}
            </SelectInput>
          </FieldShell>
        ) : null}
        {state.sourceType === "release" ? (
          <FieldShell label="Release Source" htmlFor="gallery-source-release" error={validation.errors.sourceId} required={state.status === "published"}>
            <SelectInput id="gallery-source-release" value={state.sourceId} onChange={(event) => updateField("sourceId", event.target.value)}>
              <option value="">Select release</option>
              {releases.map((release) => (
                <option key={release.releaseId} value={release.releaseId}>{release.title} - {release.status}</option>
              ))}
            </SelectInput>
          </FieldShell>
        ) : null}
        {state.sourceType !== "artist" && state.sourceType !== "release" ? (
          <FieldShell label="Source ID" htmlFor="gallery-source-id" help="Optional/manual for promo, video, and custom sources.">
            <TextInput id="gallery-source-id" value={state.sourceId} onChange={(event) => updateField("sourceId", event.target.value)} />
          </FieldShell>
        ) : null}
      </div>
      {sourceWarning ? (
        <p className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning">{sourceWarning}</p>
      ) : null}
    </AdminGalleryFormSection>
  );
}
