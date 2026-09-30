import type { MediaAsset, MediaAssetLink, MediaPublicationEntityType, MediaPublicationReadinessAsset } from "../../models/mediaModels";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";
import { mediaProcessingJobService } from "../media/MediaProcessingJobService";

export interface EntityPublicationAssets {
  required: MediaPublicationReadinessAsset[];
  optional: MediaPublicationReadinessAsset[];
  private_only: MediaPublicationReadinessAsset[];
  already_public: MediaPublicationReadinessAsset[];
  blocked: MediaPublicationReadinessAsset[];
  missing: MediaPublicationReadinessAsset[];
}

const requiredFieldKeys = new Set(["coverArtUrl", "profileImage", "imageUrl", "heroImageUrl", "brandLogoUrl"]);
const optionalFieldKeys = new Set(["audioPreviewUrl", "thumbnailUrl", "profileBannerUrl", "characterArtUrl", "socialImageUrl", "backgroundImageUrl", "defaultCoverArtUrl", "defaultArtistImageUrl", "defaultSocialImageUrl"]);

const publicSafeAssetTypes = new Set(["cover_art", "artist_profile", "artist_character_art", "artist_banner", "audio_preview", "promo_graphic", "gallery_image", "video_thumbnail", "social_preview", "logo", "fallback_image", "custom_image"]);

export class EntityPublicationAssetService {
  async getEntityPublicationAssets(entityType: MediaPublicationEntityType, entityId: string): Promise<EntityPublicationAssets> {
    const data = await jsonDatabase.read();
    const linked = data.mediaAssetLinks.filter((link) => link.entityType === entityType && link.entityId === entityId && link.status === "active");
    const ownerAssets = data.mediaAssets.filter((asset) => asset.ownerType === entityType && asset.ownerId === entityId);
    const syntheticLinks = ownerAssets.map<MediaAssetLink>((asset) => ({
      linkId: `owner-${asset.assetId}`,
      assetId: asset.assetId,
      entityType,
      entityId,
      fieldKey: this.fieldKeyForAsset(asset),
      status: "active",
      createdAt: asset.createdAt,
      metadata: { discoveredFrom: "owner" },
    }));
    const links = [...linked, ...syntheticLinks].filter((link, index, all) => all.findIndex((item) => item.assetId === link.assetId && item.fieldKey === link.fieldKey) === index);
    const readinessAssets = await Promise.all(links.map((link) => this.buildReadinessAsset(link, data.mediaAssets.find((asset) => asset.assetId === link.assetId) ?? null)));

    return {
      required: readinessAssets.filter((asset) => asset.classification === "required"),
      optional: readinessAssets.filter((asset) => asset.classification === "optional"),
      private_only: readinessAssets.filter((asset) => asset.classification === "private_only"),
      already_public: readinessAssets.filter((asset) => asset.classification === "already_public"),
      blocked: readinessAssets.filter((asset) => asset.classification === "blocked"),
      missing: readinessAssets.filter((asset) => asset.classification === "missing"),
    };
  }

  private fieldKeyForAsset(asset: MediaAsset): string {
    if (asset.assetType === "cover_art") return "coverArtUrl";
    if (asset.assetType === "audio_preview") return "audioPreviewUrl";
    if (asset.assetType === "artist_profile") return "profileImage";
    if (asset.assetType === "artist_banner") return "profileBannerUrl";
    if (asset.assetType === "artist_character_art") return "characterArtUrl";
    if (asset.assetType === "gallery_image") return "imageUrl";
    if (asset.assetType === "logo") return "brandLogoUrl";
    if (asset.assetType === "social_preview") return "socialImageUrl";
    return "custom";
  }

  private async buildReadinessAsset(link: MediaAssetLink, asset: MediaAsset | null): Promise<MediaPublicationReadinessAsset> {
    if (!asset) {
      return {
        assetId: link.assetId,
        assetType: "missing",
        required: requiredFieldKeys.has(link.fieldKey),
        classification: "missing",
        processingReady: false,
        storageReady: false,
        publicReady: false,
        blockingIssues: ["Linked media asset is missing."],
        warnings: [],
        metadata: { fieldKey: link.fieldKey },
      };
    }
    const storageObjects = (await mediaStoragePersistenceService.list()).filter((storage) => storage.assetId === asset.assetId);
    const activeStorage = storageObjects.find((storage) => storage.storageObjectId === asset.metadata?.storageObjectId) ?? storageObjects[0] ?? null;
    const processingSummary = await mediaProcessingJobService.buildAssetProcessingSummary(asset.assetId);
    const required = requiredFieldKeys.has(link.fieldKey);
    const privateOnly = asset.assetType === "full_song";
    const storageReady = Boolean(activeStorage && ["ready", "uploaded", "processing"].includes(activeStorage.status));
    const processingReady = processingSummary.requiredOutputsReady && !["failed", "blocked"].includes(processingSummary.overallStatus);
    const alreadyPublic = asset.status === "published" && activeStorage?.accessLevel === "public" && Boolean(asset.url || activeStorage.publicUrl);
    const blockingIssues = [
      ...(privateOnly && required ? ["Full-song asset is assigned to a public field."] : []),
      ...(!publicSafeAssetTypes.has(asset.assetType) && !privateOnly ? [`Asset type ${asset.assetType} is not public-delivery approved.`] : []),
      ...(required && !storageReady ? ["Required asset storage is not ready."] : []),
      ...(required && !processingReady ? ["Required processing is not complete."] : []),
    ];
    const warnings = [
      ...(!required && !processingReady ? ["Optional processing is incomplete or failed."] : []),
      ...(!storageReady ? ["Storage readiness is pending."] : []),
    ];
    const classification: MediaPublicationReadinessAsset["classification"] = privateOnly
      ? "private_only"
      : blockingIssues.length
        ? "blocked"
        : alreadyPublic
          ? "already_public"
          : required
            ? "required"
            : optionalFieldKeys.has(link.fieldKey)
              ? "optional"
              : "optional";
    return {
      assetId: asset.assetId,
      assetType: asset.assetType,
      required,
      classification,
      processingReady,
      storageReady,
      publicReady: alreadyPublic,
      blockingIssues,
      warnings,
      metadata: {
        fieldKey: link.fieldKey,
        storageObjectId: activeStorage?.storageObjectId ?? null,
        processingStatus: processingSummary.overallStatus,
      },
    };
  }
}

export const entityPublicationAssetService = new EntityPublicationAssetService();
