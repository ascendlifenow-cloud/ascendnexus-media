export type ExportPackageType = "artist_export" | "release_export" | "media_library_export" | "mixed_export" | "full_content_backup";
export type ExportJobStatus = "queued" | "planning" | "collecting_records" | "collecting_assets" | "validating" | "packaging" | "checksumming" | "storing" | "completed" | "failed" | "cancelled" | "expired";
export type ImportJobStatus = "uploaded" | "quarantined" | "inspecting" | "incompatible" | "ready_for_dry_run" | "dry_running" | "conflicts_found" | "ready_to_import" | "importing_records" | "importing_assets" | "restoring_relationships" | "verifying" | "completed" | "failed" | "rolling_back" | "rolled_back" | "cancelled";
export type ImportMode = "create_only" | "merge" | "replace_selected" | "restore";
export type ImportIdStrategy = "preserve_when_available" | "always_remap" | "environment_aware";
export type ImportPublicationStrategy = "import_as_draft" | "preserve_publication_state" | "preserve_only_if_verified" | "never_publish";
export type ImportConflictSeverity = "info" | "warning" | "blocking" | "critical";
export type ExportArchiveFormat = "tar";
export type ExportEncryptionMode = "none" | "server_managed_key" | "operator_passphrase" | "recipient_public_key";

export interface ExportSelection {
  artistIds?: string[];
  releaseIds?: string[];
  mediaAssetIds?: string[];
  allArtists?: boolean;
  allReleases?: boolean;
  allMedia?: boolean;
}

export interface ExportOptions {
  preset?: string;
  packageVersion?: "1.0.0" | "2.0.0" | "2";
  archiveFormat?: ExportArchiveFormat;
  signPackage?: boolean;
  requireSignature?: boolean;
  encryptPackage?: boolean;
  encryptionMode?: ExportEncryptionMode;
  recipientKeyId?: string;
  requireEncryptionForProtectedMedia?: boolean;
  includeReleases?: boolean;
  includeMedia?: boolean;
  includeDerivatives?: boolean;
  includePublicationHistory?: boolean;
  includeAccessPolicies?: boolean;
  includeSeoMetadata?: boolean;
  includeAssignments?: boolean;
  includeOriginals?: boolean;
  includeArchivedAssets?: boolean;
  includeQuarantinedAssets?: boolean;
  exportProtectedMedia?: boolean;
}

export interface ExportRecordEnvelope<T = unknown> {
  recordType: string;
  sourceId: string;
  sourcePublicId?: string;
  sourceSlug?: string;
  schemaVersion: number;
  recordVersion: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  payload: T;
  relationships: Record<string, unknown>;
  assetReferences: string[];
  exportMetadata: Record<string, unknown>;
}

export interface ExportPackageManifest {
  packageId: string;
  packageType: ExportPackageType;
  packageVersion: string;
  schemaVersion: number;
  applicationVersion: string;
  sourceEnvironment: string;
  sourceInstanceId?: string;
  createdAt: string;
  createdBy: string;
  exportMode: string;
  selectionSummary: Record<string, unknown>;
  recordCounts: Record<string, number>;
  assetCounts: Record<string, number>;
  totalBytes: number;
  includedSections: string[];
  dependencyPolicy: string;
  publicationPolicy: string;
  accessPolicyMode: string;
  checksumAlgorithm: "sha256";
  compatibility: { status: "compatible"; minimumImporterPackageVersion: string };
  warnings: string[];
  metadata: Record<string, unknown>;
}

export interface ExportPackageFile {
  path: string;
  storageObjectId?: string;
  assetId?: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  encoding: "base64";
  data: string;
  accessLevel: string;
}

export interface ExportPackageV2ChecksumEntry {
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  mediaType?: string;
  recordType?: string;
}

export interface PackageSignatureMetadata {
  signatureVersion: number;
  algorithm: "Ed25519";
  keyId: string;
  signerId: string;
  signedAt: string;
  signatureScope: string[];
  manifestDigest: string;
  packageMetadataDigest: string;
  checksumManifestDigest: string;
  packageId: string;
  packageVersion: string;
}

export interface PackageEncryptionMetadata {
  encryptionVersion: number;
  algorithm: "AES-256-GCM";
  keyWrappingMode: Exclude<ExportEncryptionMode, "none">;
  keyReference?: string;
  recipientKeyId?: string;
  kdf?: string;
  salt?: string;
  nonce: string;
  authTag: string;
  authenticationTagMode: "detached";
  createdAt: string;
  metadataVisibility: "safe_operational_metadata";
}

export interface TrustedPackageSigner {
  signerId: string;
  name: string;
  keyId: string;
  algorithm: "Ed25519";
  publicKeyPem: string;
  trustScope: string[];
  status: "trusted" | "restricted" | "expired" | "revoked" | "disabled";
  validFrom: string;
  validUntil?: string;
  revokedAt?: string;
  revocationReason?: string;
  allowedSourceEnvironments: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface AnmExportPackage {
  manifest: ExportPackageManifest;
  package: {
    extension: ".anmexport";
    format: "anm-json-base64" | "anm-tar-v2";
    generatedAt: string;
  };
  records: {
    artists: ExportRecordEnvelope[];
    releases: ExportRecordEnvelope[];
    mediaAssets: ExportRecordEnvelope[];
    mediaAssignments: ExportRecordEnvelope[];
    galleries: ExportRecordEnvelope[];
    publicationRecords: ExportRecordEnvelope[];
    accessPolicies: ExportRecordEnvelope[];
    aliases: ExportRecordEnvelope[];
  };
  assets: ExportPackageFile[];
  derivatives: ExportPackageFile[];
  reports: {
    exportSummary: Record<string, unknown>;
    validationReport: Record<string, unknown>;
  };
  checksums: Record<string, string>;
  packageChecksum?: string;
}

export interface ExportJob {
  exportJobId: string;
  packageId: string;
  requestedBy: string;
  packageType: ExportPackageType;
  selection: ExportSelection;
  options: ExportOptions;
  status: ExportJobStatus;
  progress: number;
  currentStage: string;
  recordCounts: Record<string, number>;
  assetCounts: Record<string, number>;
  bytesProcessed: number;
  estimatedBytes?: number;
  packageStorageReference?: string;
  packageChecksum?: string;
  packageVersion?: string;
  archiveFormat?: ExportArchiveFormat;
  signatureStatus?: string;
  encryptionStatus?: string;
  securitySummary?: Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadCount: number;
  lastDownloadedAt?: string;
  warnings: string[];
  errors: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface ImportConflict {
  conflictId: string;
  importJobId: string;
  conflictType: string;
  recordType: string;
  sourceRecordId: string;
  targetRecordId?: string;
  severity: ImportConflictSeverity;
  description: string;
  allowedResolutions: string[];
  selectedResolution?: string;
  status: "open" | "resolved" | "ignored";
  metadataSafe: Record<string, unknown>;
}

export interface ImportJob {
  importJobId: string;
  packageId: string;
  requestedBy: string;
  sourcePackageReference: string;
  status: ImportJobStatus;
  mode: ImportMode;
  conflictStrategy: string;
  publicationStrategy: ImportPublicationStrategy;
  idStrategy: ImportIdStrategy;
  progress: number;
  currentStage: string;
  packageManifest?: ExportPackageManifest;
  compatibilityResult?: Record<string, unknown>;
  recordPlan?: Record<string, unknown>;
  assetPlan?: Record<string, unknown>;
  conflictSummary?: Record<string, unknown>;
  validationSummary?: Record<string, unknown>;
  signatureSummary?: Record<string, unknown>;
  encryptionSummary?: Record<string, unknown>;
  checkpointSummary?: Record<string, unknown>;
  createdRecordIds: string[];
  updatedRecordIds: string[];
  createdAssetIds: string[];
  updatedAssetIds: string[];
  rollbackReference?: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  warnings: string[];
  errors: string[];
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}
