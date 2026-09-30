import type { ArtistAdminRecord, MediaAssetRecord } from "../../../../models/admin";
import type { ReleaseExternalLinks } from "../../../../models/release";
import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { AdminReleaseArtistFields } from "./AdminReleaseArtistFields";
import { AdminReleaseDetailsFields } from "./AdminReleaseDetailsFields";
import { AdminReleaseExternalLinksFields } from "./AdminReleaseExternalLinksFields";
import { AdminReleaseFeaturedFields } from "./AdminReleaseFeaturedFields";
import { AdminReleaseGenreStyleFields } from "./AdminReleaseGenreStyleFields";
import { AdminReleaseIdentityFields } from "./AdminReleaseIdentityFields";
import { AdminReleaseLyricsFields } from "./AdminReleaseLyricsFields";
import { AdminReleaseMediaFields } from "./AdminReleaseMediaFields";
import { AdminReleaseSeoFields } from "./AdminReleaseSeoFields";
import { AdminReleaseSocialFields } from "./AdminReleaseSocialFields";
import { AdminReleaseStatusFields } from "./AdminReleaseStatusFields";

interface AdminReleaseFormProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  artists: ArtistAdminRecord[];
  mediaAssets: MediaAssetRecord[];
  selectedArtist: ArtistAdminRecord | null;
  isEditMode: boolean;
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
  updateExternalLink: (platform: keyof ReleaseExternalLinks, value: string) => void;
}

export function AdminReleaseForm({
  state,
  validation,
  artists,
  mediaAssets,
  selectedArtist,
  isEditMode,
  updateField,
  updateExternalLink,
}: AdminReleaseFormProps) {
  const artistName = selectedArtist?.displayName ?? "Unassigned artist";

  return (
    <form className="grid gap-5" onSubmit={(event) => event.preventDefault()}>
      <AdminReleaseArtistFields state={state} validation={validation} artists={artists} updateField={updateField} />
      <AdminReleaseIdentityFields state={state} validation={validation} isEditMode={isEditMode} updateField={updateField} />
      <AdminReleaseDetailsFields state={state} validation={validation} updateField={updateField} />
      <AdminReleaseMediaFields state={state} validation={validation} artistName={artistName} mediaAssets={mediaAssets} updateField={updateField} />
      <AdminReleaseGenreStyleFields state={state} updateField={updateField} />
      <AdminReleaseLyricsFields state={state} updateField={updateField} />
      <AdminReleaseExternalLinksFields state={state} validation={validation} updateExternalLink={updateExternalLink} />
      <AdminReleaseFeaturedFields state={state} artist={selectedArtist} updateField={updateField} />
      <AdminReleaseSeoFields state={state} validation={validation} updateField={updateField} />
      <AdminReleaseSocialFields state={state} validation={validation} updateField={updateField} />
      <AdminReleaseStatusFields state={state} validation={validation} artist={selectedArtist} updateField={updateField} />
    </form>
  );
}
