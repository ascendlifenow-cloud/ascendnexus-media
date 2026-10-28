import type { MediaAsset, MediaAssetLink, MediaStorageObject } from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";

const audioTypes = new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/flac", "audio/x-flac", "audio/aac", "audio/mp4", "audio/ogg"]);
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

export function privateProductionMedia(asset: MediaAsset, objects: MediaStorageObject[], links: MediaAssetLink[], releaseId: string, role: "audio" | "artwork") {
  const storage = objects.filter((item) => item.assetId === asset.assetId && !["deleted", "archived"].includes(item.status));
  if (asset.assetType !== (role === "audio" ? "full_song" : "cover_art") || asset.status !== "draft" || asset.metadata?.deletedAt || storage.length !== 1) return null;
  const object = storage[0];
  if ([asset.url, asset.thumbnailUrl, asset.largeUrl].some((locator) => locator && locator !== object.storagePath)) return null;
  const prefix = `${mediaBackendConfig.privatePrefix.replace(/^\/+|\/+$/g, "")}/`;
  if (!["ready", "uploaded"].includes(object.status) || !["private", "admin_only", "signed"].includes(object.accessLevel) || object.publicUrl || object.signedUrl || !object.storagePath.startsWith(prefix) || /(?:^|\/)\.\.(?:\/|$)|\\/.test(object.storagePath) || !(role === "audio" ? audioTypes : imageTypes).has(object.mimeType) || !/^[a-f0-9]{64}$/.test(object.checksum ?? "") || !Number.isSafeInteger(object.fileSizeBytes) || object.fileSizeBytes <= 0) return null;
  const fields = role === "audio" ? ["fullSongAssetId", "fullSongUrl"] : ["coverArt", "coverArtUrl"];
  if (links.some((link) => link.assetId === asset.assetId && link.status === "active" && !(link.entityType === "release" && link.entityId === releaseId && fields.includes(link.fieldKey)))) return null;
  return object;
}

export const privateProductionAudio = (asset: MediaAsset, objects: MediaStorageObject[], links: MediaAssetLink[], releaseId: string) => privateProductionMedia(asset, objects, links, releaseId, "audio");
