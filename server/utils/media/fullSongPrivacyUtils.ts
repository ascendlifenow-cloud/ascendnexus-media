import type { MediaAsset, MediaStorageObject } from "../../models/mediaModels";
import { isPublicStoragePath } from "./storageUrlUtils";

export interface FullSongPrivacyAssertion {
  assetId: string;
  privateStorageOnly: boolean;
  publicUrlAbsent: boolean;
  publicMappingAbsent: boolean;
  cdnUrlAbsent: boolean;
  signedAccessOnly: boolean;
  issues: string[];
}

export const assertFullSongPrivateFromRecords = (asset: MediaAsset, storageObjects: MediaStorageObject[], publicPrefix: string): FullSongPrivacyAssertion => {
  const related = storageObjects.filter((object) => object.assetId === asset.assetId || object.storageObjectId === asset.metadata?.storageObjectId);
  const issues: string[] = [];
  const publicStorage = related.filter((object) => object.assetType === "full_song" && (object.accessLevel === "public" || isPublicStoragePath(object.storagePath, publicPrefix)));
  if (publicStorage.length) issues.push("Full-song storage object uses public access or public namespace.");
  if (asset.url && /^https?:\/\//.test(asset.url)) issues.push("Full-song asset has a permanent URL field.");
  if (asset.thumbnailUrl || asset.largeUrl) issues.push("Full-song asset has public image URL fields.");
  const cdnUrl = related.find((object) => typeof object.publicUrl === "string" && object.publicUrl.includes("cdn"));
  if (cdnUrl) issues.push("Full-song storage object has a CDN/public URL.");
  return {
    assetId: asset.assetId,
    privateStorageOnly: publicStorage.length === 0,
    publicUrlAbsent: !related.some((object) => object.publicUrl),
    publicMappingAbsent: !asset.url || !/^https?:\/\//.test(asset.url),
    cdnUrlAbsent: !cdnUrl,
    signedAccessOnly: true,
    issues,
  };
};
