import { ImagePlus, Link2, Trash2 } from "lucide-react";
import type { MediaAssetRecord } from "../../../../models/admin";
import type { GalleryMediaType } from "../../../../models/gallery";
import type { AdminGalleryFormState, AdminGalleryFormValidation } from "../../../utils/adminGalleryFormUtils";
import { galleryMediaTypeLabels } from "../../../utils/adminGalleryFormUtils";
import { getGalleryUploadAssetInfo, mapGalleryAssetToGalleryFields, mapGalleryMediaTypeToAssetType } from "../../../utils/galleryImageUploadUtils";
import { useAdminGalleryImageUpload } from "../../../hooks/useAdminGalleryImageUpload";
import { ArtistProfileImage } from "../../../../components/media/ArtistProfileImage";
import { CoverArtImage } from "../../../../components/media/CoverArtImage";
import { Badge } from "../../../../components/ui/Badge";
import { AdminFileUploadZone } from "../../../upload";
import { MediaAssetLinkPicker } from "../../media-links/MediaAssetLinkPicker";
import { FieldShell, SelectInput, TextInput } from "./AdminGalleryFormControls";
import { AdminGalleryFormSection } from "./AdminGalleryFormSection";

interface AdminGalleryMediaFieldsProps {
  state: AdminGalleryFormState;
  validation: AdminGalleryFormValidation;
  mediaAssets: MediaAssetRecord[];
  updateField: <K extends keyof AdminGalleryFormState>(field: K, value: AdminGalleryFormState[K]) => void;
}

const mediaTypes = Object.keys(galleryMediaTypeLabels) as GalleryMediaType[];

export function AdminGalleryMediaFields({ state, validation, mediaAssets, updateField }: AdminGalleryMediaFieldsProps) {
  const galleryUpload = useAdminGalleryImageUpload({ state, updateField });
  const uploadInfo = getGalleryUploadAssetInfo(state);
  const imageUrl = state.imageUrl || state.thumbnailUrl;
  const uploadStatus = imageUrl.trim()
    ? galleryUpload.wasReplaced
      ? "Replaced"
      : uploadInfo.pendingAssignment
        ? "Pending Save"
        : "Uploaded"
      : "Missing";
  const compatibleAssetType = mapGalleryMediaTypeToAssetType(state.mediaType);
  const selectableAssets = mediaAssets.filter((asset) =>
    asset.status !== "archived" &&
    [compatibleAssetType, "custom_image", "promo_graphic", "gallery_image"].includes(asset.assetType) &&
    Boolean((asset.url || asset.thumbnailUrl || asset.largeUrl || "").trim()),
  );
  const handleGalleryAssetSelected = (asset: MediaAssetRecord) => {
    const patch = mapGalleryAssetToGalleryFields(asset, state);
    if (!patch) return;
    Object.entries(patch).forEach(([field, value]) => {
      if (field === "altText" && state.altText.trim()) return;
      updateField(field as keyof AdminGalleryFormState, value as never);
    });
  };

  return (
    <AdminGalleryFormSection title="Media Selection" description="Upload a gallery visual or select an existing Media Library asset. Public delivery remains blocked until the backend verifies a public-safe URL.">
      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <div className="grid gap-3">
          {state.mediaType === "artist_profile" ? (
            <ArtistProfileImage
              src={imageUrl}
              artistName={state.title || "Gallery item"}
              displayName={state.title || "Gallery item"}
              alt={state.altText}
              size="card"
              fallbackVariant="minimal"
            />
          ) : (
            <CoverArtImage
              src={imageUrl}
              title={state.title || "Untitled gallery item"}
              alt={state.altText}
              size="card"
              fallbackVariant="minimal"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant={imageUrl.trim() ? "glass" : "sunrise"}>{uploadStatus}</Badge>
            <Badge variant="neutral">{galleryMediaTypeLabels[state.mediaType]}</Badge>
            {uploadInfo.assetId ? <Badge variant="neutral">Linked Asset</Badge> : null}
          </div>
        </div>
        <div className="grid gap-4">
          <MediaAssetLinkPicker
            assets={selectableAssets}
            entityType="gallery_item"
            fieldKey="imageUrl"
            intendedUse="gallery_image"
            assetTypeFilter={[compatibleAssetType, "custom_image", "promo_graphic", "gallery_image"]}
            mediaCategoryFilter="image"
            onConfirm={handleGalleryAssetSelected}
          />
          <AdminFileUploadZone
            uploadTarget={galleryUpload.uploadTarget}
            uploadOptions={galleryUpload.uploadOptions}
            accept={galleryUpload.accept}
            multiple={false}
            maxFiles={1}
            label="Upload Gallery Image"
            description="Choose a JPEG, PNG, or WebP visual for this gallery item."
            helperText={`Mapped asset type: ${mapGalleryMediaTypeToAssetType(state.mediaType)}. SVG and GIF are blocked by default.`}
            pickerLabel="Choose Gallery Image"
            onUploadStart={galleryUpload.handleUploadStart}
            onUploadSuccess={galleryUpload.handleUploadSuccess}
            onUploadError={galleryUpload.handleUploadError}
          />
          {galleryUpload.uploadErrors.length ? (
            <div className="rounded-md border border-anm-danger/30 bg-anm-danger/10 px-3 py-2 text-sm text-anm-danger" role="alert">
              {galleryUpload.uploadErrors.join(" ")}
            </div>
          ) : null}
          {[...galleryUpload.uploadWarnings, ...galleryUpload.readinessWarnings].length ? (
            <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning" aria-live="polite">
              {[...galleryUpload.uploadWarnings, ...galleryUpload.readinessWarnings].join(" ")}
            </div>
          ) : null}
          <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Linked gallery media asset</p>
                <p className="mt-1 text-xs text-white/52">{uploadInfo.assetId ? `Asset ${uploadInfo.assetId}` : "No uploaded gallery media asset linked yet."}</p>
                {uploadInfo.storageObjectId ? <p className="mt-1 text-xs text-white/42">Storage {uploadInfo.storageObjectId}</p> : null}
                {uploadInfo.originalFileName ? <p className="mt-1 text-xs text-white/42">File {uploadInfo.originalFileName}</p> : null}
              </div>
              <button
                type="button"
                onClick={galleryUpload.clearGalleryImage}
                disabled={!imageUrl.trim()}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-warning/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                Clear Gallery Image
              </button>
            </div>
            {uploadInfo.hasPreviousAssets ? <p className="mt-3 text-xs text-white/45">Previous gallery assets are preserved in metadata and remain in the media library.</p> : null}
          </div>
          <div className="grid gap-2 text-xs text-white/48 md:grid-cols-2">
            <p className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-anm-electric" aria-hidden />
              Draft uploads stay admin-only until this gallery item is published.
            </p>
            <p className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-anm-sky" aria-hidden />
              New-gallery uploads are saved with pending assignment metadata.
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Media Type" htmlFor="gallery-media-type" required>
          <SelectInput
            id="gallery-media-type"
            value={state.mediaType}
            onChange={(event) => updateField("mediaType", event.target.value as AdminGalleryFormState["mediaType"])}
          >
            {mediaTypes.map((mediaType) => (
              <option key={mediaType} value={mediaType}>{galleryMediaTypeLabels[mediaType]}</option>
            ))}
          </SelectInput>
        </FieldShell>
        <FieldShell label="Media Asset" htmlFor="gallery-media-asset" help="Selected through the Media Library shelf above.">
          <TextInput id="gallery-media-asset" value={state.mediaAssetId} onChange={(event) => updateField("mediaAssetId", event.target.value)} />
        </FieldShell>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FieldShell label="Verified Image URL" htmlFor="gallery-image-url" error={validation.errors.imageUrl} required={state.status === "published"}>
          <TextInput id="gallery-image-url" value={state.imageUrl} onChange={(event) => updateField("imageUrl", event.target.value)} />
        </FieldShell>
        <FieldShell label="Verified Thumbnail URL" htmlFor="gallery-thumbnail-url">
          <TextInput id="gallery-thumbnail-url" value={state.thumbnailUrl} onChange={(event) => updateField("thumbnailUrl", event.target.value)} />
        </FieldShell>
      </div>
    </AdminGalleryFormSection>
  );
}
