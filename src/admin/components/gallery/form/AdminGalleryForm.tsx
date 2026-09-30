import type { ArtistAdminRecord, MediaAssetRecord, SongReleaseAdminRecord } from "../../../../models/admin";
import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { AdminGalleryAccessibilityFields } from "./AdminGalleryAccessibilityFields";
import { AdminGalleryDisplayFields } from "./AdminGalleryDisplayFields";
import { AdminGalleryIdentityFields } from "./AdminGalleryIdentityFields";
import { AdminGalleryMediaFields } from "./AdminGalleryMediaFields";
import { AdminGallerySortFields } from "./AdminGallerySortFields";
import { AdminGallerySourceFields } from "./AdminGallerySourceFields";
import { AdminGalleryStatusFields } from "./AdminGalleryStatusFields";

interface AdminGalleryFormProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  mediaAssets: MediaAssetRecord[];
  artists: ArtistAdminRecord[];
  releases: SongReleaseAdminRecord[];
  selectedMediaAsset: MediaAssetRecord | null;
  selectedArtist: ArtistAdminRecord | null;
  selectedRelease: SongReleaseAdminRecord | null;
  isEditMode: boolean;
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

export function AdminGalleryForm({
  state,
  validation,
  mediaAssets,
  artists,
  releases,
  selectedMediaAsset,
  selectedArtist,
  selectedRelease,
  isEditMode,
  updateField,
}: AdminGalleryFormProps) {
  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
      <AdminGalleryIdentityFields state={state} validation={validation} isEditMode={isEditMode} updateField={updateField} />
      <AdminGallerySourceFields
        state={state}
        validation={validation}
        artists={artists}
        releases={releases}
        selectedArtist={selectedArtist}
        selectedRelease={selectedRelease}
        updateField={updateField}
      />
      <AdminGalleryMediaFields state={state} validation={validation} mediaAssets={mediaAssets} updateField={updateField} />
      <AdminGalleryDisplayFields state={state} artists={artists} releases={releases} updateField={updateField} />
      <AdminGalleryAccessibilityFields state={state} validation={validation} updateField={updateField} />
      <AdminGallerySortFields state={state} validation={validation} updateField={updateField} />
      <AdminGalleryStatusFields
        state={state}
        validation={validation}
        selectedMediaAsset={selectedMediaAsset}
        selectedArtist={selectedArtist}
        selectedRelease={selectedRelease}
        updateField={updateField}
      />
    </form>
  );
}
