import path from "node:path";
import type { MediaPublicationEntityType } from "../../models/mediaModels";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";

const safeSegment = (value: string | undefined, fallback: string): string =>
  (value || fallback).toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || fallback;

export const buildPublicationPublicStoragePath = (input: {
  entityType: MediaPublicationEntityType;
  entityId: string;
  assetType: string;
  versionId: string;
  fileName: string;
}): string => {
  const fileName = safeSegment(path.basename(input.fileName), "media-file");
  const entityId = safeSegment(input.entityId, "entity");
  const assetType = safeSegment(input.assetType, "asset");
  const versionId = safeSegment(input.versionId, "version");
  if (input.entityType === "artist") return `${mediaBackendConfig.publicPrefix}/artists/${entityId}/${assetType}/${versionId}/${fileName}`;
  if (input.entityType === "release") return `${mediaBackendConfig.publicPrefix}/releases/${entityId}/${assetType}/${versionId}/${fileName}`;
  if (input.entityType === "gallery_item") return `${mediaBackendConfig.publicPrefix}/gallery/${entityId}/${versionId}/${fileName}`;
  if (input.entityType === "site_config") return `${mediaBackendConfig.publicPrefix}/site/${assetType}/${versionId}/${fileName}`;
  return `${mediaBackendConfig.publicPrefix}/${safeSegment(input.entityType, "custom")}/${entityId}/${assetType}/${versionId}/${fileName}`;
};
