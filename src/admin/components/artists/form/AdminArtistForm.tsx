import { ImagePlus, Link2, Trash2 } from "lucide-react";
import type { MediaAssetRecord } from "../../../../models/admin";
import type { AdminArtistFormState } from "../../../utils/adminArtistFormUtils";
import type { AdminArtistFormValidation } from "../../../utils/adminArtistFormUtils";
import type { ArtistArtworkUploadKind } from "../../../utils/artistArtworkUploadUtils";
import { getArtistArtworkAssetInfo, getArtistArtworkLabel } from "../../../utils/artistArtworkUploadUtils";
import { useAdminArtistArtworkUpload } from "../../../hooks/useAdminArtistArtworkUpload";
import { resolveAdminImagePreviewUrl } from "../../../utils/adminMediaPreviewUrlUtils";
import { ArtistBannerImage } from "../../../../components/media/ArtistBannerImage";
import { ArtistProfileImage } from "../../../../components/media/ArtistProfileImage";
import { Badge } from "../../../../components/ui/Badge";
import { AdminFileUploadZone } from "../../../upload";
import { MediaAssetLinkPicker } from "../../media-links/MediaAssetLinkPicker";
import { AdminArtistFormSection } from "./AdminArtistFormSection";
import { FieldShell, SelectInput, TextArea, TextInput } from "./AdminArtistFormControls";

const linkPlatforms: Array<keyof AdminArtistFormState["externalLinks"]> = [
  "spotify",
  "appleMusic",
  "youtube",
  "suno",
  "soundCloud",
  "tikTok",
  "instagram",
  "website",
];

interface AdminArtistFormProps {
  state: AdminArtistFormState;
  validation: AdminArtistFormValidation;
  mediaAssets: MediaAssetRecord[];
  updateField: <K extends keyof AdminArtistFormState>(field: K, value: AdminArtistFormState[K]) => void;
  updateExternalLink: (platform: keyof AdminArtistFormState["externalLinks"], value: string) => void;
}

export function AdminArtistForm({ state, validation, mediaAssets, updateField, updateExternalLink }: AdminArtistFormProps) {
  const error = validation.errors;
  const artworkUpload = useAdminArtistArtworkUpload({ state, updateField });
  const artworkInfo = getArtistArtworkAssetInfo(state);
  const artistName = state.name || state.displayName || "New Artist";
  const displayName = state.displayName || state.name || "New Artist";

  const getArtworkUrl = (kind: ArtistArtworkUploadKind) => {
    if (kind === "profileImage") return state.profileImage;
    if (kind === "thumbnailImage") return state.profileThumbnailUrl;
    if (kind === "characterArt") return state.characterArtUrl;
    return state.profileBannerUrl;
  };

  const getArtworkAssetId = (kind: ArtistArtworkUploadKind) => {
    if (kind === "profileImage") return artworkInfo.profileImageAssetId;
    if (kind === "thumbnailImage") return artworkInfo.thumbnailAssetId;
    if (kind === "characterArt") return artworkInfo.characterArtAssetId;
    return artworkInfo.bannerAssetId;
  };

  const getArtworkStorageObjectId = (kind: ArtistArtworkUploadKind) => {
    if (kind === "profileImage") return artworkInfo.profileImageStorageObjectId;
    if (kind === "thumbnailImage") return artworkInfo.thumbnailStorageObjectId;
    if (kind === "characterArt") return artworkInfo.characterArtStorageObjectId;
    return artworkInfo.bannerStorageObjectId;
  };

  const renderArtworkPreview = (kind: ArtistArtworkUploadKind) => {
    const src = getArtworkUrl(kind);
    const previewSrc = resolveAdminImagePreviewUrl(src, getArtworkStorageObjectId(kind));
    if (kind === "bannerImage") {
      return <ArtistBannerImage src={previewSrc || src} artistName={artistName} displayName={displayName} />;
    }
    return (
      <ArtistProfileImage
        src={previewSrc || src}
        artistName={artistName}
        displayName={displayName}
        size={kind === "thumbnailImage" ? "thumbnail" : "card"}
        fallbackVariant="minimal"
      />
    );
  };

  const renderArtworkUpload = (kind: ArtistArtworkUploadKind, description: string, helperText: string) => {
    const url = getArtworkUrl(kind);
    const assetId = getArtworkAssetId(kind);
    const status = url.trim()
      ? artworkUpload.replaced[kind]
        ? "Replaced"
        : artworkInfo.pendingAssignment
          ? "Pending Save"
          : "Uploaded"
      : "Missing";
    const assetTypeFilter = kind === "characterArt"
      ? ["artist_character_art", "custom_image", "promo_graphic"] as const
      : kind === "bannerImage"
        ? ["artist_banner", "custom_image", "promo_graphic", "social_preview"] as const
        : ["artist_profile", "custom_image", "promo_graphic"] as const;
    const fieldKey = kind === "profileImage"
      ? "profileImage"
      : kind === "thumbnailImage"
        ? "profileThumbnailUrl"
        : kind === "characterArt"
          ? "characterArtUrl"
          : "profileBannerUrl";
    const intendedUse = kind === "characterArt"
      ? "artist_character_art"
      : kind === "bannerImage"
        ? "artist_banner"
        : "artist_profile_image";
    const selectableAssets = mediaAssets.filter((asset) =>
      asset.status !== "archived" &&
      assetTypeFilter.includes(asset.assetType as never) &&
      Boolean((asset.url || asset.thumbnailUrl || asset.largeUrl || "").trim()),
    );
    return (
      <div className="grid gap-4 rounded-md border border-white/10 bg-white/[0.02] p-4">
        <div className="grid gap-4 lg:grid-cols-[12rem_1fr]">
          <div className="grid gap-3">
            {renderArtworkPreview(kind)}
            <div className="flex flex-wrap gap-2">
              <Badge variant={url.trim() ? "glass" : "sunrise"}>{status}</Badge>
              {assetId ? <Badge variant="neutral">Linked Asset</Badge> : null}
            </div>
          </div>
          <div className="grid gap-4">
            <div>
              <h3 className="text-base font-semibold text-white">{getArtistArtworkLabel(kind)}</h3>
              <p className="mt-1 text-sm text-white/55">{description}</p>
            </div>
            <MediaAssetLinkPicker
              assets={selectableAssets}
              entityType="artist"
              fieldKey={fieldKey}
              intendedUse={intendedUse}
              assetTypeFilter={[...assetTypeFilter]}
              mediaCategoryFilter="image"
              onConfirm={(asset) => artworkUpload.selectExistingArtwork(kind, asset)}
            />
            <AdminFileUploadZone
              uploadTarget={artworkUpload.uploadTargets[kind]}
              uploadOptions={artworkUpload.uploadOptions[kind]}
              accept={artworkUpload.accept}
              multiple={false}
              maxFiles={1}
              label={`Upload ${getArtistArtworkLabel(kind)}`}
              description={`Choose a JPEG, PNG, or WebP ${getArtistArtworkLabel(kind).toLowerCase()} for this artist.`}
              helperText={helperText}
              pickerLabel={`Choose ${getArtistArtworkLabel(kind)}`}
              onUploadStart={() => artworkUpload.handleUploadStart(kind)}
              onUploadSuccess={(result) => artworkUpload.handleUploadSuccess(kind, result)}
              onUploadError={(errors) => artworkUpload.handleUploadError(kind, errors)}
            />
            {artworkUpload.uploadErrors[kind].length ? (
              <div className="rounded-md border border-anm-danger/30 bg-anm-danger/10 px-3 py-2 text-sm text-anm-danger" role="alert">
                {artworkUpload.uploadErrors[kind].join(" ")}
              </div>
            ) : null}
            {artworkUpload.uploadWarnings[kind].length ? (
              <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning" aria-live="polite">
                {artworkUpload.uploadWarnings[kind].join(" ")}
              </div>
            ) : null}
            <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Linked media asset</p>
                  <p className="mt-1 text-xs text-white/52">{assetId ? `Asset ${assetId}` : "No uploaded media asset linked yet."}</p>
                  {getArtworkStorageObjectId(kind) ? <p className="mt-1 text-xs text-white/42">Storage {getArtworkStorageObjectId(kind)}</p> : null}
                </div>
                <button
                  type="button"
                  onClick={() => artworkUpload.clearArtwork(kind)}
                  disabled={!url.trim()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/12 px-3 py-2 text-sm font-semibold text-white/80 transition hover:border-anm-warning/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 focus:outline-none focus:ring-2 focus:ring-anm-electric/45"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Clear {getArtistArtworkLabel(kind)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-5">
      <AdminArtistFormSection title="Artist Identity" description="Core internal and public identity fields.">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Display Name" htmlFor="displayName" required error={error.displayName}>
            <TextInput id="displayName" value={state.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
          </FieldShell>
          <FieldShell label="Name" htmlFor="name" required error={error.name}>
            <TextInput id="name" value={state.name} onChange={(event) => updateField("name", event.target.value)} />
          </FieldShell>
          <FieldShell label="Slug" htmlFor="slug" required={state.status === "active"} error={error.slug} help="Lowercase URL-safe slug.">
            <TextInput id="slug" value={state.slug} onChange={(event) => updateField("slug", event.target.value)} />
          </FieldShell>
          <FieldShell label="Short Bio" htmlFor="shortBio">
            <TextInput id="shortBio" value={state.shortBio} onChange={(event) => updateField("shortBio", event.target.value)} />
          </FieldShell>
        </div>
        <FieldShell label="Bio" htmlFor="bio" error={error.bio} help="Recommended for all artists and required before activation.">
          <TextArea id="bio" value={state.bio} onChange={(event) => updateField("bio", event.target.value)} />
        </FieldShell>
      </AdminArtistFormSection>

      <AdminArtistFormSection title="Public Profile" description="Sort order and featured placement readiness.">
        <div className="grid gap-4 md:grid-cols-3">
          <FieldShell label="Sort Order" htmlFor="sortOrder" error={error.sortOrder}>
            <TextInput id="sortOrder" type="number" value={state.sortOrder} onChange={(event) => updateField("sortOrder", event.target.value)} />
          </FieldShell>
          <FieldShell label="Featured Sort Order" htmlFor="featuredSortOrder" error={error.featuredSortOrder}>
            <TextInput id="featuredSortOrder" type="number" value={state.featuredSortOrder} onChange={(event) => updateField("featuredSortOrder", event.target.value)} />
          </FieldShell>
          <label className="mt-8 flex items-center gap-2 text-sm font-semibold text-white/78">
            <input type="checkbox" checked={state.featured} onChange={(event) => updateField("featured", event.target.checked)} />
            Featured Artist
          </label>
        </div>
      </AdminArtistFormSection>

      <AdminArtistFormSection title="Visual Assets" description="Upload artist artwork, keep draft uploads admin-safe, and populate public profile image fields.">
        {renderArtworkUpload("profileImage", "Primary public artist image used in directory cards and artist pages.", "Recommended: 1200x1200 profile image. Minimum 800x800. SVG and GIF are blocked.")}
        {renderArtworkUpload("thumbnailImage", "Optional compact thumbnail for future dense admin/public layouts.", "Use a square JPEG, PNG, or WebP thumbnail. Maximum file size follows profile image rules.")}
        {renderArtworkUpload("characterArt", "Optional AI persona character artwork for richer artist identity and future gallery use.", "Recommended: 2000x2000 or larger. Minimum 1000x1000. Maximum 15 MB.")}
        {renderArtworkUpload("bannerImage", "Optional wide banner image for hero and promotional placements.", "Recommended: 1920x1080 wide image near 16:9. Minimum 1600x900. Maximum 15 MB.")}
        {[...artworkUpload.readinessWarnings].length ? (
          <div className="rounded-md border border-anm-warning/30 bg-anm-warning/10 px-3 py-2 text-sm text-anm-warning" aria-live="polite">
            {artworkUpload.readinessWarnings.join(" ")}
          </div>
        ) : null}
        <div className="grid gap-2 text-xs text-white/48 md:grid-cols-2">
          <p className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4 text-anm-electric" aria-hidden />
            Draft uploads stay admin-only until artist publishing rules make them public-ready.
          </p>
          <p className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-anm-sky" aria-hidden />
            New-artist uploads are saved with pending assignment metadata.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <FieldShell label="Profile Image" htmlFor="profileImage" error={error.profileImage}>
            <TextInput id="profileImage" value={state.profileImage} onChange={(event) => updateField("profileImage", event.target.value)} />
          </FieldShell>
          <FieldShell label="Thumbnail URL" htmlFor="profileThumbnailUrl" error={error.profileThumbnailUrl}>
            <TextInput id="profileThumbnailUrl" value={state.profileThumbnailUrl} onChange={(event) => updateField("profileThumbnailUrl", event.target.value)} />
          </FieldShell>
          <FieldShell label="Banner URL" htmlFor="profileBannerUrl" error={error.profileBannerUrl}>
            <TextInput id="profileBannerUrl" value={state.profileBannerUrl} onChange={(event) => updateField("profileBannerUrl", event.target.value)} />
          </FieldShell>
        </div>
        <FieldShell label="Character Art URL" htmlFor="characterArtUrl" error={error.characterArtUrl}>
          <TextInput id="characterArtUrl" value={state.characterArtUrl} onChange={(event) => updateField("characterArtUrl", event.target.value)} />
        </FieldShell>
        {artworkInfo.hasPreviousAssets ? <p className="text-xs text-white/45">Previous artist artwork assets are preserved in metadata and remain in the media library unless archived separately.</p> : null}
      </AdminArtistFormSection>

      <AdminArtistFormSection title="Genres & Style Tags" description="Comma-separated for now, duplicate-safe in save mapping.">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Genres" htmlFor="genresInput" help="Example: Pop, Hip-Hop, Cinematic">
            <TextInput id="genresInput" value={state.genresInput} onChange={(event) => updateField("genresInput", event.target.value)} />
          </FieldShell>
          <FieldShell label="Style Tags" htmlFor="styleTagsInput" help="Example: dreamy, cosmic, uplifting">
            <TextInput id="styleTagsInput" value={state.styleTagsInput} onChange={(event) => updateField("styleTagsInput", event.target.value)} />
          </FieldShell>
        </div>
      </AdminArtistFormSection>

      <AdminArtistFormSection title="External Links" description="Platform URL foundation using the current artist external link model.">
        <div className="grid gap-4 md:grid-cols-2">
          {linkPlatforms.map((platform) => (
            <FieldShell key={platform} label={platform} htmlFor={`link-${platform}`} error={error[`externalLinks.${platform}`]}>
              <TextInput id={`link-${platform}`} value={state.externalLinks[platform]} onChange={(event) => updateExternalLink(platform, event.target.value)} />
            </FieldShell>
          ))}
        </div>
      </AdminArtistFormSection>

      <AdminArtistFormSection title="SEO Metadata" description="Leave blank to use generated artist defaults.">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldShell label="SEO Title" htmlFor="seoTitle"><TextInput id="seoTitle" value={state.seoTitle} onChange={(event) => updateField("seoTitle", event.target.value)} /></FieldShell>
          <FieldShell label="Canonical Path" htmlFor="seoCanonicalPath"><TextInput id="seoCanonicalPath" value={state.seoCanonicalPath} onChange={(event) => updateField("seoCanonicalPath", event.target.value)} /></FieldShell>
          <FieldShell label="SEO Image URL" htmlFor="seoImageUrl" error={error.seoImageUrl}><TextInput id="seoImageUrl" value={state.seoImageUrl} onChange={(event) => updateField("seoImageUrl", event.target.value)} /></FieldShell>
          <label className="mt-8 flex items-center gap-2 text-sm font-semibold text-white/78"><input type="checkbox" checked={state.seoNoIndex} onChange={(event) => updateField("seoNoIndex", event.target.checked)} />No-index</label>
        </div>
        <FieldShell label="SEO Description" htmlFor="seoDescription"><TextArea id="seoDescription" value={state.seoDescription} onChange={(event) => updateField("seoDescription", event.target.value)} /></FieldShell>
      </AdminArtistFormSection>

      <AdminArtistFormSection title="Social Preview Metadata" description="Leave blank to use artist profile social defaults.">
        <div className="grid gap-4 md:grid-cols-2">
          <FieldShell label="Social Title" htmlFor="socialTitle"><TextInput id="socialTitle" value={state.socialTitle} onChange={(event) => updateField("socialTitle", event.target.value)} /></FieldShell>
          <FieldShell label="Social Image URL" htmlFor="socialImageUrl" error={error.socialImageUrl}><TextInput id="socialImageUrl" value={state.socialImageUrl} onChange={(event) => updateField("socialImageUrl", event.target.value)} /></FieldShell>
          <FieldShell label="Social Image Alt" htmlFor="socialImageAlt"><TextInput id="socialImageAlt" value={state.socialImageAlt} onChange={(event) => updateField("socialImageAlt", event.target.value)} /></FieldShell>
          <FieldShell label="Twitter Card" htmlFor="twitterCard">
            <SelectInput id="twitterCard" value={state.twitterCard} onChange={(event) => updateField("twitterCard", event.target.value as AdminArtistFormState["twitterCard"])}>
              <option value="summary_large_image">Summary Large Image</option>
              <option value="summary">Summary</option>
              <option value="player">Player</option>
            </SelectInput>
          </FieldShell>
        </div>
        <FieldShell label="Social Description" htmlFor="socialDescription"><TextArea id="socialDescription" value={state.socialDescription} onChange={(event) => updateField("socialDescription", event.target.value)} /></FieldShell>
      </AdminArtistFormSection>

      <AdminArtistFormSection title="Publishing Status" description="Draft and archived artists remain hidden publicly.">
        <FieldShell label="Status" htmlFor="status">
          <SelectInput id="status" value={state.status} onChange={(event) => updateField("status", event.target.value as AdminArtistFormState["status"])}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </SelectInput>
        </FieldShell>
      </AdminArtistFormSection>
    </div>
  );
}
