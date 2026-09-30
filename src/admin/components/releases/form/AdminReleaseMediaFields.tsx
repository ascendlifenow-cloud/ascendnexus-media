import { FileAudio, ImagePlus, Link2, Scissors, ShieldCheck, Trash2 } from "lucide-react";
import type { MediaAssetRecord } from "../../../../models/admin";
import type { AdminReleaseFormState, AdminReleaseFormValidation } from "../../../utils/adminReleaseFormUtils";
import { getReleaseCoverArtAssetInfo, mapCoverArtAssetToReleaseFields } from "../../../utils/releaseCoverArtUploadUtils";
import { getReleaseAudioAssetInfo } from "../../../utils/releaseAudioUploadUtils";
import { useAdminReleaseAudioUpload } from "../../../hooks/useAdminReleaseAudioUpload";
import { useAdminReleaseCoverArtUpload } from "../../../hooks/useAdminReleaseCoverArtUpload";
import { resolveAdminImagePreviewUrl } from "../../../utils/adminMediaPreviewUrlUtils";
import { AudioPreviewPlayer } from "../../../../components/AudioPreviewPlayer";
import { CoverArtImage } from "../../../../components/media/CoverArtImage";
import { Badge } from "../../../../components/ui/Badge";
import { AdminFileUploadZone } from "../../../upload";
import { MediaAssetLinkPicker } from "../../media-links/MediaAssetLinkPicker";
import { FieldShell, TextInput } from "./AdminReleaseFormControls";
import { AdminReleaseFormSection } from "./AdminReleaseFormSection";

interface AdminReleaseMediaFieldsProps {
  state: AdminReleaseFormState;
  validation: AdminReleaseFormValidation;
  artistName: string;
  mediaAssets: MediaAssetRecord[];
  updateField: <K extends keyof AdminReleaseFormState>(field: K, value: AdminReleaseFormState[K]) => void;
}

const hasUsableMediaReference = (...values: Array<string | null | undefined>): boolean =>
  values.some((value) => Boolean(value?.trim()));

export function AdminReleaseMediaFields({ state, validation, artistName, mediaAssets, updateField }: AdminReleaseMediaFieldsProps) {
  const coverArtUpload = useAdminReleaseCoverArtUpload({ state, updateField });
  const audioUpload = useAdminReleaseAudioUpload({ state, updateField });
  const coverArtInfo = getReleaseCoverArtAssetInfo(state);
  const audioInfo = getReleaseAudioAssetInfo(state);
  const coverArtStatus = state.coverArtUrl.trim()
    ? coverArtUpload.wasReplaced
      ? "Replaced"
      : coverArtInfo.pendingAssignment
        ? "Pending Save"
        : "Uploaded"
    : "Missing";
  const audioPreviewStatus = state.audioPreviewUrl.trim()
    ? audioUpload.replaced.audioPreview
      ? "Replaced"
      : audioInfo.audioPreviewPendingAssignment
        ? "Pending Save"
        : "Uploaded"
    : "Missing";
  const fullSongStatus = audioInfo.hasFullSong
    ? audioUpload.replaced.fullSong
      ? "Replaced"
      : audioInfo.fullSongPendingAssignment
        ? "Pending Save"
        : "Stored"
    : "Not Uploaded";
  const selectableCoverArtAssets = mediaAssets.filter((asset) =>
    ["cover_art", "custom_image", "promo_graphic", "social_preview"].includes(asset.assetType) &&
    asset.status !== "archived" &&
    hasUsableMediaReference(asset.url, asset.thumbnailUrl, asset.largeUrl),
  );
  const selectableAudioPreviewAssets = mediaAssets.filter((asset) =>
    ["audio_preview", "custom_audio"].includes(asset.assetType) &&
    asset.status !== "archived" &&
    hasUsableMediaReference(asset.url),
  );
  const selectableFullSongAssets = mediaAssets.filter((asset) =>
    ["full_song", "custom_audio"].includes(asset.assetType) &&
    asset.status !== "archived" &&
    hasUsableMediaReference(asset.url),
  );
  const coverArtPreviewUrl = resolveAdminImagePreviewUrl(state.coverArtUrl, coverArtInfo.storageObjectId);

  const handleCoverArtSelected = (asset: MediaAssetRecord) => {
    const patch = mapCoverArtAssetToReleaseFields(asset, state);
    if (!patch) {
      coverArtUpload.setUploadErrors(["Selected media asset does not have a usable image URL."]);
      return;
    }
    Object.entries(patch).forEach(([field, value]) => {
      updateField(field as keyof AdminReleaseFormState, value as never);
    });
    coverArtUpload.setUploadWarnings([`Selected existing media asset "${asset.title}". Save the release to persist this cover art link.`]);
    coverArtUpload.setUploadErrors([]);
  };

  return (
    <AdminReleaseFormSection title="Cover Art & Media" description="Upload cover art, link media assets, and manage public media URLs for this release.">
      <div className="grid gap-4 lg:grid-cols-[12rem_1fr]">
        <div className="grid gap-3">
          <CoverArtImage src={coverArtPreviewUrl || state.coverArtUrl} alt={state.coverArtAlt || undefined} title={state.title || "Untitled release"} artistName={artistName} size="card" />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={state.coverArtUrl.trim() ? "glass" : "sunrise"}>{coverArtStatus}</Badge>
            {coverArtInfo.assetId ? <Badge variant="neutral">Linked Asset</Badge> : null}
          </div>
        </div>
        <div className="grid gap-4">
          <MediaAssetLinkPicker
            assets={selectableCoverArtAssets}
            entityType="release"
            fieldKey="coverArtUrl"
            intendedUse="release_cover_art"
            assetTypeFilter={["cover_art", "custom_image", "promo_graphic", "social_preview"]}
            mediaCategoryFilter="image"
            onConfirm={handleCoverArtSelected}
          />
          <AdminFileUploadZone
            uploadTarget={coverArtUpload.uploadTarget}
            uploadOptions={coverArtUpload.uploadOptions}
            accept={coverArtUpload.accept}
            multiple={false}
            maxFiles={1}
            label="Upload Cover Art"
            description="Choose a JPEG, PNG, or WebP cover image for this release."
            helperText="Recommended: square 3000x3000 image. Minimum 1000x1000. SVG and GIF are blocked."
            pickerLabel="Choose Cover Art"
            onUploadStart={coverArtUpload.handleUploadStart}
            onUploadSuccess={coverArtUpload.handleUploadSuccess}
            onUploadError={coverArtUpload.handleUploadError}
          />
          {coverArtUpload.uploadErrors.length ? (
            <div className="rounded-md border border-anm-danger/30 bg-anm-danger/10 px-3 py-2 text-sm text-anm-danger" role="alert">
              {coverArtUpload.uploadErrors.join(" ")}
            </div>
          ) : null}
          {[...coverArtUpload.uploadWarnings, ...coverArtUpload.readinessWarnings].length ? (
            <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning" aria-live="polite">
              {[...coverArtUpload.uploadWarnings, ...coverArtUpload.readinessWarnings].join(" ")}
            </div>
          ) : null}
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Linked cover art asset</p>
                <p className="mt-1 text-xs text-white/52">
                  {coverArtInfo.assetId ? `Asset ${coverArtInfo.assetId}` : "No uploaded media asset linked yet."}
                </p>
                {coverArtInfo.storageObjectId ? <p className="mt-1 text-xs text-white/42">Storage {coverArtInfo.storageObjectId}</p> : null}
              </div>
              <button
                type="button"
                onClick={coverArtUpload.clearCoverArt}
                disabled={!state.coverArtUrl.trim()}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-warning/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Clear Cover Art
              </button>
            </div>
            {coverArtInfo.hasPreviousAssets ? (
              <p className="mt-3 text-xs text-white/45">Previous uploaded cover assets are preserved in release metadata and remain in the media library.</p>
            ) : null}
          </div>
          <FieldShell label="Cover Art URL" htmlFor="release-cover-art" error={validation.errors.coverArtUrl}>
            <TextInput id="release-cover-art" value={state.coverArtUrl} onChange={(event) => updateField("coverArtUrl", event.target.value)} />
          </FieldShell>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldShell label="Thumbnail URL" htmlFor="release-cover-thumb" error={validation.errors.coverArtThumbnailUrl}>
              <TextInput id="release-cover-thumb" value={state.coverArtThumbnailUrl} onChange={(event) => updateField("coverArtThumbnailUrl", event.target.value)} />
            </FieldShell>
            <FieldShell label="Large Cover URL" htmlFor="release-cover-large" error={validation.errors.coverArtLargeUrl}>
              <TextInput id="release-cover-large" value={state.coverArtLargeUrl} onChange={(event) => updateField("coverArtLargeUrl", event.target.value)} />
            </FieldShell>
          </div>
          <FieldShell label="Cover Art Alt Text" htmlFor="release-cover-alt">
            <TextInput id="release-cover-alt" value={state.coverArtAlt} onChange={(event) => updateField("coverArtAlt", event.target.value)} />
          </FieldShell>
          <div className="grid gap-2 text-xs text-white/48 md:grid-cols-2">
            <p className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-anm-electric" aria-hidden />
              Draft uploads stay admin-only until publish-ready URLs are configured.
            </p>
            <p className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-anm-sky" aria-hidden />
              New-release uploads are saved with pending assignment metadata.
            </p>
          </div>
          {!state.coverArtUrl.trim() ? <p className="text-sm text-anm-warning">Missing cover art will fall back in public UI.</p> : null}
        </div>
      </div>
      <div className="order-2 grid gap-4 rounded-md border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Audio Preview</h3>
            <p className="mt-1 text-sm text-white/55">Upload a short public-preview audio file. Draft uploads remain admin-only until release rules allow playback.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={state.audioPreviewUrl.trim() ? "glass" : "sunrise"}>{audioPreviewStatus}</Badge>
            {audioInfo.audioPreviewAssetId ? <Badge variant="neutral">Linked Asset</Badge> : null}
          </div>
        </div>
        <MediaAssetLinkPicker
          assets={selectableAudioPreviewAssets}
          entityType="release"
          fieldKey="audioPreviewUrl"
          intendedUse="release_audio_preview"
          assetTypeFilter={["audio_preview", "custom_audio"]}
          mediaCategoryFilter="audio"
          onConfirm={(asset) => audioUpload.selectExistingAudioAsset("audioPreview", asset)}
        />
        <AdminFileUploadZone
          uploadTarget={audioUpload.audioPreviewTarget}
          uploadOptions={audioUpload.audioPreviewOptions}
          accept={audioUpload.accept}
          multiple={false}
          maxFiles={1}
          label="Upload Audio Preview"
          description="Choose an MP3, WAV, M4A, AAC, or OGG preview file for this release."
          helperText="Recommended preview length is 5-120 seconds. Maximum file size is 50 MB."
          pickerLabel="Choose Audio Preview"
          onUploadStart={audioUpload.handleAudioPreviewUploadStart}
          onUploadSuccess={audioUpload.handleAudioPreviewUploadSuccess}
          onUploadError={audioUpload.handleAudioPreviewUploadError}
        />
        {audioUpload.uploadErrors.audioPreview.length ? (
          <div className="rounded-md border border-anm-danger/30 bg-anm-danger/10 px-3 py-2 text-sm text-anm-danger" role="alert">
            {audioUpload.uploadErrors.audioPreview.join(" ")}
          </div>
        ) : null}
        {[...audioUpload.uploadWarnings.audioPreview, ...audioUpload.readinessWarnings].length ? (
          <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning" aria-live="polite">
            {[...audioUpload.uploadWarnings.audioPreview, ...audioUpload.readinessWarnings].join(" ")}
          </div>
        ) : null}
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Linked audio preview asset</p>
              <p className="mt-1 text-xs text-white/52">
                {audioInfo.audioPreviewAssetId ? `Asset ${audioInfo.audioPreviewAssetId}` : "No uploaded audio preview asset linked yet."}
              </p>
              {audioInfo.audioPreviewStorageObjectId ? <p className="mt-1 text-xs text-white/42">Storage {audioInfo.audioPreviewStorageObjectId}</p> : null}
              {state.audioPreviewOriginalFileName ? <p className="mt-1 text-xs text-white/42">File {state.audioPreviewOriginalFileName}</p> : null}
            </div>
            <button
              type="button"
              onClick={audioUpload.clearAudioPreview}
              disabled={!state.audioPreviewUrl.trim()}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-warning/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Clear Audio Preview
            </button>
          </div>
          {audioInfo.hasPreviousAudioPreviewAssets ? (
            <p className="mt-3 text-xs text-white/45">Previous uploaded audio preview assets are preserved in release metadata and remain in the media library.</p>
          ) : null}
        </div>
        <FieldShell label="Audio Preview URL" htmlFor="release-audio-preview" error={validation.errors.audioPreviewUrl}>
          <TextInput id="release-audio-preview" value={state.audioPreviewUrl} onChange={(event) => updateField("audioPreviewUrl", event.target.value)} />
        </FieldShell>
        {state.audioPreviewUrl.trim() ? (
          <AudioPreviewPlayer
            releaseId={(state.releaseId ?? state.slug) || "release-preview"}
            title={state.title || "Untitled release"}
            artistName={artistName}
            audioPreviewUrl={state.audioPreviewUrl}
            compact
          />
        ) : (
          <p className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning">
            Audio preview is missing. Public song pages will show Preview Coming Soon.
          </p>
        )}
      </div>
      <div className="order-1 grid gap-4 rounded-md border border-white/10 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">Full Song Audio</h3>
            <p className="mt-1 text-sm text-white/55">Upload full song files for admin catalog readiness. Generate a separate 30-second preview, or keep using the manual preview uploader above.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={audioInfo.hasFullSong ? "glass" : "neutral"}>{fullSongStatus}</Badge>
            <button
              type="button"
              onClick={() => void audioUpload.generatePreviewFromFullSong()}
              disabled={!audioInfo.fullSongAssetId || audioUpload.generatingPreview}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-gold/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
            >
              <Scissors className="h-4 w-4" aria-hidden />
              {audioUpload.generatingPreview ? "Generating Preview" : "Generate 30s Preview"}
            </button>
          </div>
        </div>
        <MediaAssetLinkPicker
          assets={selectableFullSongAssets}
          entityType="release"
          fieldKey="fullSongUrl"
          intendedUse="release_full_song"
          assetTypeFilter={["full_song", "custom_audio"]}
          mediaCategoryFilter="audio"
          onConfirm={(asset) => audioUpload.selectExistingAudioAsset("fullSong", asset)}
        />
        <AdminFileUploadZone
          uploadTarget={audioUpload.fullSongTarget}
          uploadOptions={audioUpload.fullSongOptions}
          accept={audioUpload.accept}
          multiple={false}
          maxFiles={1}
          label="Upload Full Song Audio"
          description="Choose the full song audio file for admin storage."
          helperText="Accepted audio formats: MP3, WAV, M4A, AAC, OGG. Maximum file size is 250 MB. Public playback remains disabled."
          pickerLabel="Choose Full Song"
          onUploadStart={audioUpload.handleFullSongUploadStart}
          onUploadSuccess={audioUpload.handleFullSongUploadSuccess}
          onUploadError={audioUpload.handleFullSongUploadError}
        />
        {audioUpload.uploadErrors.fullSong.length ? (
          <div className="rounded-md border border-anm-danger/30 bg-anm-danger/10 px-3 py-2 text-sm text-anm-danger" role="alert">
            {audioUpload.uploadErrors.fullSong.join(" ")}
          </div>
        ) : null}
        {audioUpload.uploadWarnings.fullSong.length ? (
          <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning" aria-live="polite">
            {audioUpload.uploadWarnings.fullSong.join(" ")}
          </div>
        ) : null}
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div className="grid gap-2 text-sm text-white/62">
            <p className="flex items-center gap-2 font-semibold text-white">
              <FileAudio className="h-4 w-4 text-anm-electric" aria-hidden />
              {audioInfo.fullSongAssetId ? `Asset ${audioInfo.fullSongAssetId}` : "No full song asset linked yet."}
            </p>
            {audioInfo.fullSongStorageObjectId ? <p className="text-xs text-white/42">Storage {audioInfo.fullSongStorageObjectId}</p> : null}
            {state.fullSongOriginalFileName ? <p className="text-xs text-white/42">File {state.fullSongOriginalFileName}</p> : null}
            <p className="flex items-center gap-2 text-xs text-anm-success">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Full song public playback is disabled by default.
            </p>
            {audioInfo.hasPreviousFullSongAssets ? <p className="text-xs text-white/45">Previous full song assets are preserved in metadata.</p> : null}
          </div>
        </div>
      </div>
    </AdminReleaseFormSection>
  );
}
