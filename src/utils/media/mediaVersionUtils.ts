import type { MediaAssetMetadataValue, MediaAssetRecord } from "../../models/admin";
import type { MediaAssetVersion, MediaAssetVersionHistory, MediaStorageObject } from "../../models/media";

export const createMediaVersionId = (assetId: string, versionNumber: number): string =>
  `media-version-${assetId}-${versionNumber}-${Date.now()}`;

export const getVersionUrlFromStorage = (storageObject: MediaStorageObject): string =>
  storageObject.publicUrl ?? storageObject.signedUrl ?? storageObject.storagePath;

export const buildVersionFromAsset = (
  asset: MediaAssetRecord,
  versionNumber = 1,
  storageObject?: MediaStorageObject,
  changeReason?: string,
  createdBy?: string,
): MediaAssetVersion => {
  const storageMetadata = asset.metadata?.storage;
  const storageObjectId = storageObject?.storageObjectId ??
    (storageMetadata && typeof storageMetadata === "object" && !Array.isArray(storageMetadata) && typeof storageMetadata.storageObjectId === "string"
      ? storageMetadata.storageObjectId
      : undefined);
  return {
    versionId: createMediaVersionId(asset.assetId, versionNumber),
    assetId: asset.assetId,
    versionNumber,
    storageObjectId: storageObjectId ?? `legacy-${asset.assetId}`,
    url: storageObject ? getVersionUrlFromStorage(storageObject) : asset.url,
    thumbnailUrl: asset.thumbnailUrl,
    largeUrl: asset.largeUrl,
    fileName: storageObject?.fileName ?? asset.url.split("/").pop() ?? asset.title,
    originalFileName: storageObject?.originalFileName ?? asset.url.split("/").pop() ?? asset.title,
    mimeType: storageObject?.mimeType ?? String(asset.metadata?.mimeType ?? "application/octet-stream"),
    fileSizeBytes: storageObject?.fileSizeBytes ?? Number(asset.metadata?.fileSizeBytes ?? 0),
    assetType: asset.assetType,
    status: "active",
    changeReason,
    createdAt: new Date().toISOString(),
    createdBy,
    metadata: {
      source: storageObject ? "storage_object" : "media_asset_record",
    },
  };
};

export const serializeVersionHistoryMetadata = (history: MediaAssetVersionHistory): { [key: string]: MediaAssetMetadataValue } => ({
  assetId: history.assetId,
  activeVersionId: history.activeVersionId,
  versions: history.versions.map((version) => ({
    versionId: version.versionId,
    assetId: version.assetId,
    versionNumber: version.versionNumber,
    storageObjectId: version.storageObjectId,
    url: version.url,
    thumbnailUrl: version.thumbnailUrl ?? null,
    largeUrl: version.largeUrl ?? null,
    fileName: version.fileName,
    originalFileName: version.originalFileName,
    mimeType: version.mimeType,
    fileSizeBytes: version.fileSizeBytes,
    assetType: version.assetType,
    status: version.status,
    changeReason: version.changeReason ?? null,
    replacedByVersionId: version.replacedByVersionId ?? null,
    createdAt: version.createdAt,
    createdBy: version.createdBy ?? null,
    metadata: version.metadata ?? null,
  })),
  createdAt: history.createdAt,
  updatedAt: history.updatedAt ?? null,
  metadata: history.metadata ?? null,
});

export const getActiveMediaVersion = (history: MediaAssetVersionHistory | null | undefined): MediaAssetVersion | undefined =>
  history?.versions.find((version) => version.versionId === history.activeVersionId) ??
  history?.versions.find((version) => version.status === "active");

export const getNextVersionNumber = (history: MediaAssetVersionHistory | null | undefined): number =>
  history?.versions.length ? Math.max(...history.versions.map((version) => version.versionNumber)) + 1 : 1;

export const summarizeVersionHistory = (history: MediaAssetVersionHistory): Record<string, string | number | boolean | null> => ({
  assetId: history.assetId,
  activeVersionId: history.activeVersionId,
  versionCount: history.versions.length,
  updatedAt: history.updatedAt ?? null,
});

export const compareMediaVersions = (versionA: MediaAssetVersion, versionB: MediaAssetVersion): Record<string, string | number | boolean | null> => ({
  versionA: versionA.versionId,
  versionB: versionB.versionId,
  fileNameChanged: versionA.fileName !== versionB.fileName,
  mimeTypeChanged: versionA.mimeType !== versionB.mimeType,
  fileSizeDeltaBytes: versionB.fileSizeBytes - versionA.fileSizeBytes,
  urlChanged: versionA.url !== versionB.url,
});
