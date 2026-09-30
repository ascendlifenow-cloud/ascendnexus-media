import fs from "node:fs";
import process from "node:process";

const dbPath = new URL("../../server/data/media-db.json", import.meta.url);
const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
const mediaAssets = Array.isArray(db.mediaAssets) ? db.mediaAssets : [];

const audioTypes = new Set(["audio_preview", "full_song", "stem", "instrumental", "vocal", "custom_audio"]);
const imageTypes = new Set(["cover_art", "artist_profile", "artist_character_art", "artist_banner", "promo_graphic", "gallery_image", "video_thumbnail", "social_preview", "logo", "fallback_image", "custom_image"]);
const videoTypes = new Set(["video", "lyric_video", "short_clip", "animation"]);

const getMediaCategoryFromAssetType = (assetType) => {
  if (audioTypes.has(assetType)) return "audio";
  if (imageTypes.has(assetType)) return "image";
  if (videoTypes.has(assetType)) return "video";
  return "custom";
};

const originalFileName = (asset) => typeof asset?.metadata?.originalFileName === "string" ? asset.metadata.originalFileName : asset.title ?? "";
const slugish = (value) => String(value ?? "").toLowerCase().trim().replace(/\.[a-z0-9]+$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const getMediaAssignmentSuggestion = (asset) => {
  const source = slugish(`${originalFileName(asset)} ${asset.title} ${asset.assetType}`);
  if (asset.assetType === "cover_art" || source.includes("cover")) return { suggestedEntityType: "release", suggestedEntityId: source.replace(/-?cover.*/, "") || undefined, suggestedFieldKey: "coverArtUrl", suggestedIntendedUse: "release_cover_art" };
  if (asset.assetType === "audio_preview" || source.includes("preview")) return { suggestedEntityType: "release", suggestedEntityId: source.replace(/-?preview.*/, "") || undefined, suggestedFieldKey: "audioPreviewUrl", suggestedIntendedUse: "release_audio_preview" };
  if (asset.assetType === "full_song" || asset.assetType === "custom_audio") return { suggestedEntityType: "release", suggestedEntityId: source.replace(/-?(full-song|song).*/, "") || undefined, suggestedFieldKey: "fullSongUrl", suggestedIntendedUse: "release_full_song" };
  if (asset.assetType === "artist_profile" || source.includes("profile")) return { suggestedEntityType: "artist", suggestedEntityId: source.replace(/-?profile.*/, "") || undefined, suggestedFieldKey: "profileImage", suggestedIntendedUse: "artist_profile_image" };
  if (asset.assetType === "artist_character_art" || source.includes("character")) return { suggestedEntityType: "artist", suggestedEntityId: source.replace(/-?character.*/, "") || undefined, suggestedFieldKey: "characterArtUrl", suggestedIntendedUse: "artist_character_art" };
  if (asset.assetType === "artist_banner" || source.includes("banner")) return { suggestedEntityType: "artist", suggestedEntityId: source.replace(/-?banner.*/, "") || undefined, suggestedFieldKey: "profileBannerUrl", suggestedIntendedUse: "artist_banner" };
  if (asset.assetType === "gallery_image" || asset.assetType === "promo_graphic") return { suggestedEntityType: "gallery_item", suggestedFieldKey: "imageUrl", suggestedIntendedUse: "gallery_image" };
  return {};
};

const fieldRequiresImage = (fieldKey, intendedUse) =>
  ["profileImage", "profileThumbnailUrl", "profileBannerUrl", "characterArtUrl", "coverArtUrl", "coverArtThumbnailUrl", "coverArtLargeUrl", "imageUrl", "thumbnailUrl", "heroImageUrl", "socialImageUrl", "brandLogoUrl", "defaultCoverArtUrl", "defaultArtistImageUrl", "defaultSocialImageUrl"].includes(fieldKey) ||
  ["artist_profile_image", "artist_character_art", "artist_banner", "release_cover_art", "gallery_image", "homepage_hero", "seo_image", "social_preview_image", "site_logo", "site_fallback_image"].includes(intendedUse);

const fieldRequiresAudio = (fieldKey, intendedUse) =>
  ["audioPreviewUrl", "fullSongUrl"].includes(fieldKey) ||
  ["release_audio_preview", "release_full_song"].includes(intendedUse);

const validateCompatibility = (asset, assignment) => {
  const category = getMediaCategoryFromAssetType(asset.assetType);
  const blockingIssues = [];
  if (fieldRequiresImage(assignment.fieldKey, assignment.intendedUse) && category !== "image") blockingIssues.push(`${assignment.fieldKey} requires an image asset.`);
  if (fieldRequiresAudio(assignment.fieldKey, assignment.intendedUse) && category !== "audio") blockingIssues.push(`${assignment.fieldKey} requires an audio asset.`);
  if (asset.status === "archived") blockingIssues.push("Archived media assets cannot be linked.");
  return blockingIssues;
};

const validateAdminAssignmentVisibility = (asset) => [
  ...(asset?.metadata?.deletedAt ? ["Media asset is soft-deleted."] : []),
  ...(asset?.status === "archived" ? ["Media asset is archived."] : []),
  ...(asset?.url || asset?.metadata?.storageObjectId ? [] : ["Media asset has no URL or storage object for assignment."]),
];

const fallbackAssignmentFor = (asset) => {
  const category = getMediaCategoryFromAssetType(asset.assetType);
  if (category === "audio") {
    return {
      entityType: "release",
      entityId: "assignment-verify-release",
      fieldKey: asset.assetType === "audio_preview" ? "audioPreviewUrl" : "fullSongUrl",
      intendedUse: asset.assetType === "audio_preview" ? "release_audio_preview" : "release_full_song",
    };
  }
  if (category === "image") {
    return {
      entityType: asset.assetType.startsWith("artist_") ? "artist" : "release",
      entityId: asset.assetType.startsWith("artist_") ? "assignment-verify-artist" : "assignment-verify-release",
      fieldKey: asset.assetType.startsWith("artist_") ? "profileImage" : "coverArtUrl",
      intendedUse: asset.assetType.startsWith("artist_") ? "artist_profile_image" : "release_cover_art",
    };
  }
  return {
    entityType: "gallery_item",
    entityId: "assignment-verify-gallery",
    fieldKey: "imageUrl",
    intendedUse: "gallery_image",
  };
};

const isWatchedFolderAsset = (asset) =>
  asset?.metadata?.intakeSource === "watched_folder" ||
  asset?.createdBy === "system:media-intake" ||
  asset?.ownerId === "watched_intake";

const toAssignment = (asset) => {
  const suggestion = getMediaAssignmentSuggestion(asset);
  const fallback = fallbackAssignmentFor(asset);
  return {
    entityType: suggestion.suggestedEntityType ?? fallback.entityType,
    entityId: suggestion.suggestedEntityId ?? fallback.entityId,
    fieldKey: suggestion.suggestedFieldKey ?? fallback.fieldKey,
    intendedUse: suggestion.suggestedIntendedUse ?? fallback.intendedUse,
  };
};

const watchedFolderAssets = mediaAssets.filter(isWatchedFolderAsset);
const skipped = watchedFolderAssets
  .filter((asset) => asset.status === "archived" || asset?.metadata?.deletedAt)
  .map((asset) => ({
    assetId: asset.assetId,
    title: asset.title,
    assetType: asset.assetType,
    status: asset.status,
    reason: asset?.metadata?.deletedAt ? "soft_deleted" : "archived",
  }));

const checked = watchedFolderAssets.filter((asset) => asset.status !== "archived" && !asset?.metadata?.deletedAt).map((asset) => {
  const assignment = toAssignment(asset);
  const blockingIssues = [...validateCompatibility(asset, assignment), ...validateAdminAssignmentVisibility(asset)];
  return {
    assetId: asset.assetId,
    title: asset.title,
    assetType: asset.assetType,
    status: asset.status,
    assignment,
    assignable: blockingIssues.length === 0,
    blockingIssues,
    warnings: [],
    assignmentNotes: [
      ...(asset.status === "draft" ? ["Draft asset is admin-assignable."] : []),
      ...(!String(asset.url ?? "").startsWith("/uploads/") && !String(asset.url ?? "").startsWith("http") ? ["Private/admin-only storage is expected for assignment; public exposure remains controlled by publishing or protected delivery."] : []),
    ],
  };
});

const failed = checked.filter((item) => !item.assignable);
const report = {
  success: failed.length === 0,
  checkedAt: new Date().toISOString(),
  watchedFolderAssetCount: watchedFolderAssets.length,
  skippedCount: skipped.length,
  assignableCount: checked.length - failed.length,
  blockedCount: failed.length,
  skipped,
  failed,
  checked,
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exit(1);
