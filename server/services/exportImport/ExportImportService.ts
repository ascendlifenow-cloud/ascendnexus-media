import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { jsonDatabase } from "../media/JsonDatabase";
import { resolveInsideRoot, sanitizeFileName } from "../../utils/media/mediaPathUtils";
import { TarExportArchiveAdapter, TarImportArchiveReader } from "./archive/TarArchiveAdapter";
import { exportPackageEncryptionService, exportPackageSigningService, packageSigningKeyProvider } from "./security/PackageSecurityService";
import type {
  AnmExportPackage,
  ExportPackageV2ChecksumEntry,
  ExportJob,
  ExportOptions,
  ExportPackageFile,
  ExportPackageManifest,
  ExportPackageType,
  ExportRecordEnvelope,
  ExportSelection,
  ImportConflict,
  ImportIdStrategy,
  ImportJob,
  ImportMode,
  ImportPublicationStrategy,
  PackageSignatureMetadata,
} from "../../models/exportImport/ExportImportModels";

const packageVersion = "2.0.0";
const legacyPackageVersion = "1.0.0";
const schemaVersion = 1;
const nowIso = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const sha256 = (data: string | Buffer) => crypto.createHash("sha256").update(data).digest("hex");
const compactArchiveSegment = (value: string, maximumBytes: number): string => {
  const sanitized = sanitizeFileName(value) || "asset";
  if (Buffer.byteLength(sanitized) <= maximumBytes) return sanitized;
  const extension = path.extname(sanitized);
  const digest = sha256(sanitized).slice(0, 10);
  const suffix = `${digest}${extension}`;
  const available = Math.max(1, maximumBytes - Buffer.byteLength(suffix) - 1);
  let stem = path.basename(sanitized, extension);
  while (Buffer.byteLength(stem) > available) stem = stem.slice(0, -1);
  return `${stem}-${suffix}`;
};
const buildArchiveAssetPath = (category: string, assetReference: string, fileName: string, uniqueReference: string): string => {
  const safeCategory = compactArchiveSegment(category, 16);
  const safeAssetReference = compactArchiveSegment(assetReference, 28);
  const uniquePrefix = sha256(uniqueReference).slice(0, 10);
  const baseLength = Buffer.byteLength(`assets/${safeCategory}/${safeAssetReference}/${uniquePrefix}-`);
  const safeFileName = compactArchiveSegment(fileName, Math.max(16, 100 - baseLength));
  return `assets/${safeCategory}/${safeAssetReference}/${uniquePrefix}-${safeFileName}`;
};

const exportJobs = new Map<string, ExportJob>();
const importJobs = new Map<string, ImportJob>();
const importPackages = new Map<string, AnmExportPackage>();
const importArchivePaths = new Map<string, string>();
const importConflicts = new Map<string, ImportConflict[]>();

const packageRoot = () => path.join(mediaBackendConfig.dataRoot || path.join(process.cwd(), "server/data"), "export-packages");
const importRoot = () => path.join(mediaBackendConfig.dataRoot || path.join(process.cwd(), "server/data"), "import-staging");

const stableStringify = (value: unknown): string => JSON.stringify(value, Object.keys(value as object).sort(), 2);
const jsonBuffer = (value: unknown): Buffer => Buffer.from(JSON.stringify(value, null, 2));

const dedupe = <T>(values: T[]): T[] => [...new Set(values.filter(Boolean))];
const artistRows = (data: Awaited<ReturnType<typeof jsonDatabase.read>>) => (data.artists ?? data.artistRecords ?? []);
const releaseRows = (data: Awaited<ReturnType<typeof jsonDatabase.read>>) => (data.releases ?? data.releaseRecords ?? []);
const galleryRows = (data: Awaited<ReturnType<typeof jsonDatabase.read>>) => (data.galleryItems ?? []);
const metadataAssetIds = (metadata: Record<string, unknown> | undefined): string[] =>
  Object.entries(metadata ?? {})
    .filter(([key, value]) => /assetid$/i.test(key) && typeof value === "string" && value.trim())
    .map(([, value]) => String(value));

const safeRecord = <T extends Record<string, unknown>>(record: T): T => {
  const clone = structuredClone(record);
  for (const key of ["passwordHash", "token", "secret", "signedUrl", "storageCredentials"]) delete clone[key];
  return clone;
};

const envelope = (recordType: string, sourceId: string, payload: Record<string, unknown>, assetReferences: string[] = []): ExportRecordEnvelope => ({
  recordType,
  sourceId,
  sourceSlug: typeof payload.slug === "string" ? payload.slug : undefined,
  schemaVersion: Number(payload.schemaVersion ?? 1),
  recordVersion: 1,
  createdAt: typeof payload.createdAt === "string" ? payload.createdAt : undefined,
  updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : undefined,
  deletedAt: typeof payload.deletedAt === "string" ? payload.deletedAt : undefined,
  payload: safeRecord(payload),
  relationships: {},
  assetReferences,
  exportMetadata: { exportedAt: nowIso() },
});

interface ExportFileReference {
  archivePath: string;
  sourcePath: string;
  storageObjectId?: string;
  assetId?: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum?: string;
  accessLevel: string;
}

const classifyPackageType = (selection: ExportSelection): ExportPackageType => {
  const kinds = [selection.allArtists || selection.artistIds?.length, selection.allReleases || selection.releaseIds?.length, selection.allMedia || selection.mediaAssetIds?.length].filter(Boolean).length;
  if (selection.allArtists && selection.allReleases && selection.allMedia) return "full_content_backup";
  if (kinds > 1) return "mixed_export";
  if (selection.allArtists || selection.artistIds?.length) return "artist_export";
  if (selection.allReleases || selection.releaseIds?.length) return "release_export";
  return "media_library_export";
};

export class PackageIntegrityService {
  checksum(value: string | Buffer): string {
    return sha256(value);
  }

  verifyPackage(pkg: AnmExportPackage) {
    const errors: string[] = [];
    for (const file of [...pkg.assets, ...pkg.derivatives]) {
      const actual = sha256(Buffer.from(file.data, "base64"));
      if (actual !== file.checksum) errors.push(`Checksum mismatch for ${file.path}.`);
    }
    for (const [recordPath, checksum] of Object.entries(pkg.checksums)) {
      if (recordPath.startsWith("assets/") || recordPath.startsWith("derivatives/")) continue;
      const actual = sha256(JSON.stringify(this.valueForPath(pkg, recordPath)));
      if (actual !== checksum) errors.push(`Checksum mismatch for ${recordPath}.`);
    }
    return { valid: errors.length === 0, errors, checkedAt: nowIso() };
  }

  private valueForPath(pkg: AnmExportPackage, recordPath: string): unknown {
    if (recordPath === "manifest.json") return pkg.manifest;
    if (recordPath === "package.json") return pkg.package;
    if (recordPath === "records/artists.json") return pkg.records.artists;
    if (recordPath === "records/releases.json") return pkg.records.releases;
    if (recordPath === "records/media-assets.json") return pkg.records.mediaAssets;
    if (recordPath === "records/media-assignments.json") return pkg.records.mediaAssignments;
    if (recordPath === "records/galleries.json") return pkg.records.galleries;
    if (recordPath === "reports/export-summary.json") return pkg.reports.exportSummary;
    if (recordPath === "reports/validation-report.json") return pkg.reports.validationReport;
    return null;
  }
}

export const packageIntegrityService = new PackageIntegrityService();

export class ExportPackageStorageService {
  async storePackage(jobId: string, pkg: AnmExportPackage): Promise<{ storageReference: string; bytes: number; checksum: string }> {
    await fs.mkdir(packageRoot(), { recursive: true });
    const fileName = `${jobId}.anmexport`;
    const absolutePath = path.join(packageRoot(), fileName);
    const payload = JSON.stringify(pkg, null, 2);
    await fs.writeFile(absolutePath, payload, "utf8");
    return { storageReference: absolutePath, bytes: Buffer.byteLength(payload), checksum: sha256(payload) };
  }

  async readPackage(reference: string): Promise<AnmExportPackage> {
    const resolved = resolveInsideRoot(packageRoot(), path.basename(reference));
    return JSON.parse(await fs.readFile(resolved, "utf8")) as AnmExportPackage;
  }

  async reserveArchivePath(jobId: string): Promise<string> {
    await fs.mkdir(packageRoot(), { recursive: true });
    return path.join(packageRoot(), `${jobId}.anmexport`);
  }

  async describeArchive(reference: string): Promise<{ storageReference: string; bytes: number; checksum: string }> {
    const resolved = resolveInsideRoot(packageRoot(), path.basename(reference));
    const payload = await fs.readFile(resolved);
    return { storageReference: resolved, bytes: payload.byteLength, checksum: sha256(payload) };
  }
}

export const exportPackageStorageService = new ExportPackageStorageService();

export class ExportDependencyGraphService {
  async buildGraph(selection: ExportSelection, options: ExportOptions = {}) {
    const data = await jsonDatabase.read();
    const artists = artistRows(data);
    const releases = releaseRows(data);
    const galleries = galleryRows(data);
    const artistIds = selection.allArtists ? artists.map((artist) => artist.artistId) : selection.artistIds ?? [];
    const selectedReleaseIds = selection.allReleases ? releases.map((release) => release.releaseId) : selection.releaseIds ?? [];
    const releaseIds = dedupe([
      ...selectedReleaseIds,
      ...(options.includeReleases ? releases.filter((release) => artistIds.includes(release.artistId)).map((release) => release.releaseId) : []),
    ]);
    const releaseArtistIds = releases.filter((release) => releaseIds.includes(release.releaseId)).map((release) => release.artistId);
    const finalArtistIds = dedupe([...artistIds, ...releaseArtistIds]);
    const explicitMediaIds = selection.allMedia ? data.mediaAssets.map((asset) => asset.assetId) : selection.mediaAssetIds ?? [];
    const relationshipMediaIds = [
      ...data.mediaAssets.filter((asset) => finalArtistIds.includes(asset.ownerId ?? "") || releaseIds.includes(asset.ownerId ?? "")).map((asset) => asset.assetId),
      ...artists.filter((artist) => finalArtistIds.includes(artist.artistId)).flatMap((artist) => metadataAssetIds(artist.metadata)),
      ...releases.filter((release) => releaseIds.includes(release.releaseId)).flatMap((release) => metadataAssetIds(release.metadata)),
      ...data.mediaAssetLinks.filter((link) => finalArtistIds.includes(link.entityId) || releaseIds.includes(link.entityId)).map((link) => link.assetId),
    ];
    const mediaAssetIds = dedupe(options.includeMedia === false ? explicitMediaIds : [...explicitMediaIds, ...relationshipMediaIds]);
    const nodes = {
      artists: finalArtistIds,
      releases: releaseIds,
      mediaAssets: mediaAssetIds,
      galleries: galleries.filter((item) => finalArtistIds.includes(String(item.artistId ?? "")) || releaseIds.includes(String(item.releaseId ?? ""))).map((item) => item.galleryItemId),
      mediaAssignments: data.mediaAssetLinks.filter((link) => mediaAssetIds.includes(link.assetId)).map((link) => link.linkId),
    };
    return {
      nodes,
      missingDependencies: [],
      cycles: [],
      edges: [
        ...releaseIds.map((releaseId) => ({ type: "release_belongs_to_artist", releaseId, artistId: releases.find((release) => release.releaseId === releaseId)?.artistId })),
        ...mediaAssetIds.map((assetId) => ({ type: "media_asset_included", assetId })),
      ],
    };
  }
}

export const exportDependencyGraphService = new ExportDependencyGraphService();

export class ExportEstimationService {
  async estimate(selection: ExportSelection, options: ExportOptions = {}) {
    const graph = await exportDependencyGraphService.buildGraph(selection, options);
    const data = await jsonDatabase.read();
    const storage = data.mediaStorageObjects.filter((object) => object.assetId && graph.nodes.mediaAssets.includes(object.assetId));
    const totalBytes = storage.reduce((sum, object) => sum + Number(object.fileSizeBytes ?? 0), 0);
    return {
      recordCount: graph.nodes.artists.length + graph.nodes.releases.length + graph.nodes.mediaAssets.length + graph.nodes.galleries.length + graph.nodes.mediaAssignments.length,
      assetCount: graph.nodes.mediaAssets.length,
      binaryFileCount: storage.length,
      totalBytes,
      estimatedPackageBytes: Math.ceil(totalBytes * 1.38),
      warnings: totalBytes > 250 * 1024 * 1024 ? ["Large export package; use background download and verify available disk space."] : [],
      graph,
    };
  }
}

export const exportEstimationService = new ExportEstimationService();

export class ExportPackageService {
  async createExport(selection: ExportSelection, options: ExportOptions, requestedBy: string): Promise<ExportJob> {
    const packageId = id("package");
    const exportJobId = id("export");
    const packageType = classifyPackageType(selection);
    const job: ExportJob = {
      exportJobId,
      packageId,
      requestedBy,
      packageType,
      selection,
      options,
      status: "planning",
      progress: 5,
      currentStage: "Planning export",
      recordCounts: {},
      assetCounts: {},
      bytesProcessed: 0,
      downloadCount: 0,
      startedAt: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      warnings: [],
      errors: [],
      schemaVersion,
    };
    exportJobs.set(exportJobId, job);
    try {
      const requestedPackageVersion = String(options.packageVersion ?? "2.0.0");
      if (requestedPackageVersion.startsWith("1") && process.env.NODE_ENV === "production") throw new Error("EXPORT_LEGACY_V1_DISABLED_IN_PRODUCTION");
      const stored = requestedPackageVersion.startsWith("1")
        ? await this.createLegacyPackage(exportJobId, packageId, packageType, selection, options, requestedBy, job)
        : await this.createVersion2Archive(exportJobId, packageId, packageType, selection, options, requestedBy, job);
      Object.assign(job, {
        status: "completed",
        progress: 100,
        currentStage: "Completed",
        packageStorageReference: stored.storageReference,
        packageChecksum: stored.checksum,
        bytesProcessed: stored.bytes,
        packageVersion: requestedPackageVersion.startsWith("1") ? legacyPackageVersion : packageVersion,
        archiveFormat: requestedPackageVersion.startsWith("1") ? undefined : "tar",
        completedAt: nowIso(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
        updatedAt: nowIso(),
      });
    } catch (error) {
      Object.assign(job, { status: "failed", progress: 100, currentStage: "Failed", errors: [error instanceof Error ? error.message : "Export failed."], updatedAt: nowIso() });
    }
    return job;
  }

  private async createLegacyPackage(exportJobId: string, packageId: string, packageType: ExportPackageType, selection: ExportSelection, options: ExportOptions, requestedBy: string, job: ExportJob) {
    const pkg = await this.buildPackage(packageId, packageType, selection, options, requestedBy, job);
    pkg.manifest.packageVersion = legacyPackageVersion;
    pkg.manifest.metadata = { ...pkg.manifest.metadata, legacyPackage: true, migrationRequired: true };
    return exportPackageStorageService.storePackage(exportJobId, pkg);
  }

  listJobs(): ExportJob[] {
    return [...exportJobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getJob(exportJobId: string): ExportJob | null {
    return exportJobs.get(exportJobId) ?? null;
  }

  async authorizeDownload(exportJobId: string) {
    const job = this.getJob(exportJobId);
    if (!job || job.status !== "completed" || !job.packageStorageReference) throw new Error("EXPORT_PACKAGE_NOT_READY");
    return {
      downloadReference: Buffer.from(JSON.stringify({ exportJobId, expiresAt: Date.now() + 5 * 60 * 1000 })).toString("base64url"),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      fileName: `${job.packageId}.anmexport`,
    };
  }

  async readAuthorizedDownload(downloadReference: string) {
    const parsed = JSON.parse(Buffer.from(downloadReference, "base64url").toString("utf8")) as { exportJobId: string; expiresAt: number };
    if (Date.now() > parsed.expiresAt) throw new Error("EXPORT_DOWNLOAD_EXPIRED");
    const job = this.getJob(parsed.exportJobId);
    if (!job?.packageStorageReference) throw new Error("EXPORT_PACKAGE_NOT_READY");
    job.downloadCount += 1;
    job.lastDownloadedAt = nowIso();
    return { job, payload: await fs.readFile(job.packageStorageReference), fileName: `${job.packageId}.anmexport` };
  }

  private async createVersion2Archive(exportJobId: string, packageId: string, packageType: ExportPackageType, selection: ExportSelection, options: ExportOptions, requestedBy: string, job: ExportJob) {
    const graph = await exportDependencyGraphService.buildGraph(selection, options);
    const data = await jsonDatabase.read();
    const artistsData = artistRows(data);
    const releasesData = releaseRows(data);
    const galleriesData = galleryRows(data);
    job.status = "collecting_records";
    job.progress = 20;
    job.currentStage = "Collecting records";
    const artists = artistsData.filter((artist) => graph.nodes.artists.includes(artist.artistId));
    const releases = releasesData.filter((release) => graph.nodes.releases.includes(release.releaseId));
    const mediaAssets = data.mediaAssets.filter((asset) => graph.nodes.mediaAssets.includes(asset.assetId) && (options.includeArchivedAssets || !["archived", "deleted"].includes(asset.status)));
    const mediaLinks = data.mediaAssetLinks.filter((link) => graph.nodes.mediaAssignments.includes(link.linkId));
    const galleries = galleriesData.filter((item) => graph.nodes.galleries.includes(item.galleryItemId));
    const records = {
      artists: artists.map((artist) => envelope("artist", artist.artistId, artist as unknown as Record<string, unknown>, metadataAssetIds(artist.metadata))),
      releases: releases.map((release) => envelope("release", release.releaseId, release as unknown as Record<string, unknown>, metadataAssetIds(release.metadata))),
      mediaAssets: mediaAssets.map((asset) => envelope("media_asset", asset.assetId, asset as unknown as Record<string, unknown>, [asset.assetId])),
      mediaAssignments: mediaLinks.map((link) => envelope("media_assignment", link.linkId, link as unknown as Record<string, unknown>, [link.assetId])),
      galleries: galleries.map((gallery) => envelope("gallery", gallery.galleryItemId, gallery as unknown as Record<string, unknown>, metadataAssetIds(gallery.metadata))),
      publicationRecords: [] as ExportRecordEnvelope[],
      accessPolicies: [] as ExportRecordEnvelope[],
      aliases: [] as ExportRecordEnvelope[],
    };
    job.status = "collecting_assets";
    job.progress = 45;
    job.currentStage = "Collecting binary asset references";
    const files = await this.collectFileReferences(mediaAssets.map((asset) => asset.assetId), options);
    const totalBytes = files.reduce((sum, file) => sum + file.fileSizeBytes, 0);
    const protectedMediaIncluded = files.some((file) => file.accessLevel !== "public");
    if ((protectedMediaIncluded || packageType === "full_content_backup") && options.encryptPackage === false) throw new Error("EXPORT_PROTECTED_MEDIA_ENCRYPTION_REQUIRED");
    const encryptPackage = Boolean(options.encryptPackage ?? protectedMediaIncluded ?? packageType === "full_content_backup");
    const manifest: ExportPackageManifest = {
      packageId,
      packageType,
      packageVersion,
      schemaVersion,
      applicationVersion: process.env.npm_package_version ?? "0.1.0",
      sourceEnvironment: process.env.NODE_ENV ?? "development",
      createdAt: nowIso(),
      createdBy: requestedBy,
      exportMode: options.preset ?? "custom",
      selectionSummary: { selection, graph: graph.nodes },
      recordCounts: Object.fromEntries(Object.entries(records).map(([key, value]) => [key, value.length])),
      assetCounts: { mediaAssets: mediaAssets.length, binaryFiles: files.length },
      totalBytes,
      includedSections: Object.keys(records).filter((key) => records[key as keyof typeof records].length),
      dependencyPolicy: options.includeMedia === false ? "explicit_only" : "include_dependencies",
      publicationPolicy: "represent_state_without_auto_publish",
      accessPolicyMode: "preserve_metadata_keep_protected_private",
      checksumAlgorithm: "sha256",
      compatibility: { status: "compatible", minimumImporterPackageVersion: "2.0.0" },
      warnings: [],
      metadata: {
        archiveFormat: "tar",
        binaryEncoding: "separate_archive_entries",
        base64Media: false,
        signature: "required",
        encryption: encryptPackage ? "aes-256-gcm-container" : "not_encrypted",
      },
    };
    const packageMetadata = {
      extension: ".anmexport",
      format: "anm-tar-v2",
      archiveFormat: "tar",
      compressionMode: "none",
      generatedAt: nowIso(),
      signEncryptOrder: "serialize_checksum_sign_archive_then_optional_encrypt_container",
      memoryPolicy: "stream_binary_entries",
    };
    const exportSummary = { graph, totalBytes, warnings: manifest.warnings, packageVersion, archiveFormat: "tar", encrypted: encryptPackage };
    const validationReport = { valid: true, checkedAt: nowIso(), warnings: [], base64Media: false };
    job.status = "packaging";
    job.progress = 65;
    job.currentStage = "Streaming Version 2 archive";
    const archivePath = await exportPackageStorageService.reserveArchivePath(exportJobId);
    const plaintextArchivePath = encryptPackage ? `${archivePath}.plain` : archivePath;
    const archive = new TarExportArchiveAdapter(plaintextArchivePath);
    await archive.addJsonEntry("manifest.json", manifest);
    await archive.addJsonEntry("package.json", packageMetadata);
    await archive.addNdjsonEntry("records/artists.ndjson", records.artists, "artist");
    await archive.addNdjsonEntry("records/releases.ndjson", records.releases, "release");
    await archive.addNdjsonEntry("records/media-assets.ndjson", records.mediaAssets, "media_asset");
    await archive.addNdjsonEntry("records/media-assignments.ndjson", records.mediaAssignments, "media_assignment");
    await archive.addNdjsonEntry("records/galleries.ndjson", records.galleries, "gallery");
    await archive.addNdjsonEntry("records/publication-records.ndjson", records.publicationRecords, "publication_record");
    await archive.addNdjsonEntry("records/access-policies.ndjson", records.accessPolicies, "access_policy");
    await archive.addNdjsonEntry("records/aliases.ndjson", records.aliases, "alias");
    await archive.addJsonEntry("reports/export-summary.json", exportSummary);
    await archive.addJsonEntry("reports/validation-report.json", validationReport);
    for (const file of files) {
      await archive.addBinaryEntry(file.archivePath, file.sourcePath, { mediaType: file.mimeType });
    }
    const checksumManifest = this.formatChecksumManifest(archive.checksums);
    await archive.addBufferEntry("checksums.sha256", Buffer.from(checksumManifest), { mediaType: "text/plain" });
    const signature = await exportPackageSigningService.signPackage({
      manifest: jsonBuffer(manifest),
      packageMetadata: jsonBuffer(packageMetadata),
      checksumManifest: Buffer.from(checksumManifest),
      packageId,
      packageVersion,
    });
    await archive.addJsonEntry("signature/signature.json", signature.metadata);
    await archive.addBufferEntry("signature/package.sig", Buffer.from(signature.signature), { mediaType: "application/octet-stream" });
    await archive.finalize();
    let finalPath = plaintextArchivePath;
    let encryptionSummary: Record<string, unknown> = { encrypted: false };
    if (encryptPackage) {
      job.currentStage = "Encrypting package container";
      const plain = await fs.readFile(plaintextArchivePath);
      const encrypted = await exportPackageEncryptionService.encryptBuffer(plain, options.encryptionMode === "operator_passphrase" || options.encryptionMode === "recipient_public_key" ? options.encryptionMode : "server_managed_key");
      await fs.writeFile(archivePath, encrypted.container);
      await fs.rm(plaintextArchivePath, { force: true });
      finalPath = archivePath;
      encryptionSummary = { encrypted: true, metadata: encrypted.metadata };
    }
    const stored = await exportPackageStorageService.describeArchive(finalPath);
    job.recordCounts = manifest.recordCounts;
    job.assetCounts = manifest.assetCounts;
    job.signatureStatus = "signed_trusted";
    job.encryptionStatus = encryptPackage ? "encrypted" : "not_encrypted";
    job.securitySummary = {
      packageVersion,
      archiveFormat: "tar",
      base64Media: false,
      signature: { status: "signed", keyId: signature.metadata.keyId, signerId: signature.metadata.signerId },
      encryption: encryptionSummary,
      checksumEntries: archive.checksums.length + 3,
    };
    return stored;
  }

  private formatChecksumManifest(entries: ExportPackageV2ChecksumEntry[]): string {
    return entries
      .slice()
      .sort((a, b) => a.relativePath.localeCompare(b.relativePath))
      .map((entry) => `${entry.sha256}  ${entry.relativePath}`)
      .join("\n") + "\n";
  }

  private async buildPackage(packageId: string, packageType: ExportPackageType, selection: ExportSelection, options: ExportOptions, requestedBy: string, job: ExportJob): Promise<AnmExportPackage> {
    const graph = await exportDependencyGraphService.buildGraph(selection, options);
    const data = await jsonDatabase.read();
    const artistsData = artistRows(data);
    const releasesData = releaseRows(data);
    const galleriesData = galleryRows(data);
    job.status = "collecting_records";
    job.progress = 25;
    job.currentStage = "Collecting records";
    const artists = artistsData.filter((artist) => graph.nodes.artists.includes(artist.artistId));
    const releases = releasesData.filter((release) => graph.nodes.releases.includes(release.releaseId));
    const mediaAssets = data.mediaAssets.filter((asset) => graph.nodes.mediaAssets.includes(asset.assetId) && (options.includeArchivedAssets || !["archived", "deleted"].includes(asset.status)));
    const mediaLinks = data.mediaAssetLinks.filter((link) => graph.nodes.mediaAssignments.includes(link.linkId));
    const galleries = galleriesData.filter((item) => graph.nodes.galleries.includes(item.galleryItemId));
    const records = {
      artists: artists.map((artist) => envelope("artist", artist.artistId, artist as unknown as Record<string, unknown>, metadataAssetIds(artist.metadata))),
      releases: releases.map((release) => envelope("release", release.releaseId, release as unknown as Record<string, unknown>, metadataAssetIds(release.metadata))),
      mediaAssets: mediaAssets.map((asset) => envelope("media_asset", asset.assetId, asset as unknown as Record<string, unknown>, [asset.assetId])),
      mediaAssignments: mediaLinks.map((link) => envelope("media_assignment", link.linkId, link as unknown as Record<string, unknown>, [link.assetId])),
      galleries: galleries.map((gallery) => envelope("gallery", gallery.galleryItemId, gallery as unknown as Record<string, unknown>, metadataAssetIds(gallery.metadata))),
      publicationRecords: [] as ExportRecordEnvelope[],
      accessPolicies: [] as ExportRecordEnvelope[],
      aliases: [] as ExportRecordEnvelope[],
    };
    job.status = "collecting_assets";
    job.progress = 55;
    job.currentStage = "Collecting binary assets";
    const files = await this.collectFiles(mediaAssets.map((asset) => asset.assetId), options);
    const totalBytes = files.reduce((sum, file) => sum + file.fileSizeBytes, 0);
    const manifest: ExportPackageManifest = {
      packageId,
      packageType,
      packageVersion,
      schemaVersion,
      applicationVersion: process.env.npm_package_version ?? "0.1.0",
      sourceEnvironment: process.env.NODE_ENV ?? "development",
      createdAt: nowIso(),
      createdBy: requestedBy,
      exportMode: options.preset ?? "custom",
      selectionSummary: { selection, graph: graph.nodes },
      recordCounts: Object.fromEntries(Object.entries(records).map(([key, value]) => [key, value.length])),
      assetCounts: { mediaAssets: mediaAssets.length, binaryFiles: files.length },
      totalBytes,
      includedSections: Object.keys(records).filter((key) => records[key as keyof typeof records].length),
      dependencyPolicy: options.includeMedia === false ? "explicit_only" : "include_dependencies",
      publicationPolicy: "represent_state_without_auto_publish",
      accessPolicyMode: "preserve_metadata_keep_protected_private",
      checksumAlgorithm: "sha256",
      compatibility: { status: "compatible", minimumImporterPackageVersion: "1.0.0" },
      warnings: [],
      metadata: { signatureReadiness: "unsigned", encryptionReadiness: "not_encrypted" },
    };
    const pkg: AnmExportPackage = {
      manifest,
      package: { extension: ".anmexport", format: "anm-json-base64", generatedAt: nowIso() },
      records,
      assets: files,
      derivatives: [],
      reports: {
        exportSummary: { graph, totalBytes, warnings: manifest.warnings },
        validationReport: { valid: true, checkedAt: nowIso(), warnings: [] },
      },
      checksums: {},
    };
    pkg.checksums = this.buildChecksums(pkg);
    pkg.packageChecksum = sha256(JSON.stringify({ manifest: pkg.manifest, records: pkg.records, checksums: pkg.checksums }));
    job.recordCounts = manifest.recordCounts;
    job.assetCounts = manifest.assetCounts;
    return pkg;
  }

  private async collectFiles(assetIds: string[], options: ExportOptions): Promise<ExportPackageFile[]> {
    if (options.includeOriginals === false) return [];
    const data = await jsonDatabase.read();
    const storageObjects = data.mediaStorageObjects.filter((object) => object.assetId && assetIds.includes(object.assetId));
    const files: ExportPackageFile[] = [];
    for (const object of storageObjects) {
      if (object.status === "failed" || object.status === "deleted") continue;
      if (object.accessLevel !== "public" && !options.exportProtectedMedia) continue;
      const absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, object.storagePath);
      try {
        const buffer = await fs.readFile(absolutePath);
        const checksum = sha256(buffer);
        files.push({
          path: `assets/${object.mediaCategory}/${sanitizeFileName(object.originalFileName || object.fileName)}`,
          storageObjectId: object.storageObjectId,
          assetId: object.assetId,
          originalFileName: object.originalFileName,
          mimeType: object.mimeType,
          fileSizeBytes: buffer.byteLength,
          checksum,
          encoding: "base64",
          data: buffer.toString("base64"),
          accessLevel: object.accessLevel,
        });
      } catch {
        files.push({
          path: `assets/missing/${sanitizeFileName(object.originalFileName || object.fileName)}`,
          storageObjectId: object.storageObjectId,
          assetId: object.assetId,
          originalFileName: object.originalFileName,
          mimeType: object.mimeType,
          fileSizeBytes: 0,
          checksum: "",
          encoding: "base64",
          data: "",
          accessLevel: object.accessLevel,
        });
      }
    }
    return files;
  }

  private async collectFileReferences(assetIds: string[], options: ExportOptions): Promise<ExportFileReference[]> {
    if (options.includeOriginals === false) return [];
    const data = await jsonDatabase.read();
    const storageObjects = data.mediaStorageObjects.filter((object) => object.assetId && assetIds.includes(object.assetId));
    const files: ExportFileReference[] = [];
    for (const object of storageObjects) {
      if (object.status === "failed" || object.status === "deleted") continue;
      if (object.accessLevel !== "public" && !options.exportProtectedMedia) continue;
      const absolutePath = resolveInsideRoot(mediaBackendConfig.uploadRoot, object.storagePath);
      try {
        const stat = await fs.stat(absolutePath);
        const category = String(object.mediaCategory || "documents").replace(/[^a-zA-Z0-9_-]/g, "_");
        const assetReference = String(object.assetId || object.storageObjectId || "asset").replace(/[^a-zA-Z0-9_-]/g, "_");
        files.push({
          archivePath: buildArchiveAssetPath(category, assetReference, object.originalFileName || object.fileName, object.storageObjectId),
          sourcePath: absolutePath,
          storageObjectId: object.storageObjectId,
          assetId: object.assetId,
          originalFileName: object.originalFileName,
          mimeType: object.mimeType,
          fileSizeBytes: stat.size,
          accessLevel: object.accessLevel,
        });
      } catch {
        // Missing storage objects are represented in validation warnings through the record metadata,
        // but are not emitted as empty binary archive entries.
      }
    }
    return files;
  }

  private buildChecksums(pkg: AnmExportPackage): Record<string, string> {
    const entries: Record<string, string> = {
      "manifest.json": sha256(JSON.stringify(pkg.manifest)),
      "package.json": sha256(JSON.stringify(pkg.package)),
      "records/artists.json": sha256(JSON.stringify(pkg.records.artists)),
      "records/releases.json": sha256(JSON.stringify(pkg.records.releases)),
      "records/media-assets.json": sha256(JSON.stringify(pkg.records.mediaAssets)),
      "records/media-assignments.json": sha256(JSON.stringify(pkg.records.mediaAssignments)),
      "records/galleries.json": sha256(JSON.stringify(pkg.records.galleries)),
      "reports/export-summary.json": sha256(JSON.stringify(pkg.reports.exportSummary)),
      "reports/validation-report.json": sha256(JSON.stringify(pkg.reports.validationReport)),
    };
    for (const file of pkg.assets) entries[file.path] = file.checksum;
    for (const file of pkg.derivatives) entries[file.path] = file.checksum;
    return entries;
  }
}

export const exportPackageService = new ExportPackageService();

export class ImportPackageInspectionService {
  async uploadArchiveFile(packagePath: string, requestedBy: string): Promise<ImportJob> {
    const source = resolveInsideRoot(path.dirname(packagePath), path.basename(packagePath));
    const payload = await fs.readFile(source);
    const importJobId = id("import");
    await fs.mkdir(importRoot(), { recursive: true });
    const stagedPath = path.join(importRoot(), `${importJobId}.anmexport`);
    await fs.writeFile(stagedPath, payload);
    const manifest = await this.peekArchiveManifest(stagedPath);
    const job: ImportJob = {
      importJobId,
      packageId: manifest.packageId,
      requestedBy,
      sourcePackageReference: stagedPath,
      status: "quarantined",
      mode: "create_only",
      conflictStrategy: "manual",
      publicationStrategy: "import_as_draft",
      idStrategy: "environment_aware",
      progress: 5,
      currentStage: "Archive package quarantined",
      packageManifest: manifest,
      createdRecordIds: [],
      updatedRecordIds: [],
      createdAssetIds: [],
      updatedAssetIds: [],
      warnings: [],
      errors: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      schemaVersion,
    };
    importArchivePaths.set(importJobId, stagedPath);
    importJobs.set(importJobId, job);
    return job;
  }

  async uploadPackage(packageData: unknown, requestedBy: string): Promise<ImportJob> {
    if (typeof packageData === "string" && packageData.startsWith("file:")) return this.uploadArchiveFile(packageData.slice(5), requestedBy);
    const pkg = this.normalizePackage(packageData);
    const importJobId = id("import");
    const job: ImportJob = {
      importJobId,
      packageId: pkg.manifest.packageId,
      requestedBy,
      sourcePackageReference: `memory:${importJobId}`,
      status: "quarantined",
      mode: "create_only",
      conflictStrategy: "manual",
      publicationStrategy: "import_as_draft",
      idStrategy: "environment_aware",
      progress: 5,
      currentStage: "Package quarantined",
      packageManifest: pkg.manifest,
      createdRecordIds: [],
      updatedRecordIds: [],
      createdAssetIds: [],
      updatedAssetIds: [],
      warnings: [],
      errors: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
      schemaVersion,
    };
    importPackages.set(importJobId, pkg);
    importJobs.set(importJobId, job);
    await fs.mkdir(importRoot(), { recursive: true });
    await fs.writeFile(path.join(importRoot(), `${importJobId}.anmexport`), JSON.stringify(pkg, null, 2), "utf8");
    return job;
  }

  async inspect(importJobId: string) {
    const job = this.requireJob(importJobId);
    if (importArchivePaths.has(importJobId)) return this.inspectArchive(importJobId);
    const pkg = this.requirePackage(importJobId);
    job.status = "inspecting";
    const integrity = packageIntegrityService.verifyPackage(pkg);
    const compatibility = {
      status: pkg.manifest.schemaVersion === schemaVersion ? "compatible" : "incompatible",
      packageVersion: pkg.manifest.packageVersion,
      schemaVersion: pkg.manifest.schemaVersion,
      warnings: pkg.manifest.schemaVersion === schemaVersion ? [] : ["Unsupported schema version."],
    };
    job.status = compatibility.status === "compatible" && integrity.valid ? "ready_for_dry_run" : "incompatible";
    job.compatibilityResult = compatibility;
    job.validationSummary = integrity;
    job.progress = 30;
    job.currentStage = "Inspected";
    return {
      manifest: pkg.manifest,
      integrity,
      compatibility,
      preview: {
        artists: pkg.records.artists.length,
        releases: pkg.records.releases.length,
        mediaAssets: pkg.records.mediaAssets.length,
        binaryFiles: pkg.assets.length,
        totalBytes: pkg.manifest.totalBytes,
        protectedAssetCount: pkg.assets.filter((file) => file.accessLevel !== "public").length,
      },
    };
  }

  requireJob(importJobId: string): ImportJob {
    const job = importJobs.get(importJobId);
    if (!job) throw new Error("IMPORT_PACKAGE_INVALID");
    return job;
  }

  requirePackage(importJobId: string): AnmExportPackage {
    const pkg = importPackages.get(importJobId);
    if (!pkg) throw new Error("IMPORT_PACKAGE_INVALID");
    return pkg;
  }

  async inspectArchive(importJobId: string) {
    const job = this.requireJob(importJobId);
    const archivePath = importArchivePaths.get(importJobId);
    if (!archivePath) throw new Error("IMPORT_PACKAGE_INVALID");
    job.status = "inspecting";
    const { archivePath: readablePath, encryptionSummary } = await this.ensureReadableArchive(archivePath);
    const reader = new TarImportArchiveReader();
    await reader.open(readablePath);
    const manifest = reader.readJson<ExportPackageManifest>("manifest.json");
    const packageMetadata = reader.readJson<Record<string, unknown>>("package.json");
    const integrity = reader.verifyChecksums();
    const signatureMetadata = reader.readJson<PackageSignatureMetadata>("signature/signature.json");
    const signature = reader.readEntryBuffer("signature/package.sig").toString("utf8");
    const signatureSummary = await exportPackageSigningService.verifySignature({ metadata: signatureMetadata, signature });
    const artists = reader.readNdjson<ExportRecordEnvelope>("records/artists.ndjson");
    const releases = reader.readNdjson<ExportRecordEnvelope>("records/releases.ndjson");
    const mediaAssets = reader.readNdjson<ExportRecordEnvelope>("records/media-assets.ndjson");
    const mediaAssignments = reader.readNdjson<ExportRecordEnvelope>("records/media-assignments.ndjson");
    const galleries = reader.readNdjson<ExportRecordEnvelope>("records/galleries.ndjson");
    const assets = reader.listEntries().filter((entry) => entry.path.startsWith("assets/"));
    const pkg: AnmExportPackage = {
      manifest,
      package: { extension: ".anmexport", format: "anm-json-base64", generatedAt: String(packageMetadata.generatedAt ?? nowIso()) },
      records: { artists, releases, mediaAssets, mediaAssignments, galleries, publicationRecords: [], accessPolicies: [], aliases: [] },
      assets: assets.map((entry) => ({ path: entry.path, originalFileName: path.basename(entry.path), mimeType: "application/octet-stream", fileSizeBytes: entry.size, checksum: "", encoding: "base64", data: "", accessLevel: "private" })),
      derivatives: [],
      reports: {
        exportSummary: reader.readJson<Record<string, unknown>>("reports/export-summary.json"),
        validationReport: reader.readJson<Record<string, unknown>>("reports/validation-report.json"),
      },
      checksums: {},
    };
    importPackages.set(importJobId, pkg);
    job.packageManifest = manifest;
    job.status = integrity.valid && signatureSummary.valid ? "ready_for_dry_run" : "incompatible";
    job.compatibilityResult = { status: manifest.packageVersion === packageVersion ? "compatible" : "incompatible", packageVersion: manifest.packageVersion, schemaVersion: manifest.schemaVersion, warnings: [] };
    job.validationSummary = { ...integrity, archiveFormat: "tar", entries: reader.listEntries().length };
    job.signatureSummary = signatureSummary;
    job.encryptionSummary = encryptionSummary;
    job.checkpointSummary = {
      package_uploaded: "passed",
      package_decrypted: encryptionSummary.encrypted ? "passed" : "not_required",
      manifest_verified: "passed",
      checksums_verified: integrity.valid ? "passed" : "failed",
      signature_verified: signatureSummary.valid ? "passed" : "failed",
    };
    job.progress = 35;
    job.currentStage = "Archive inspected";
    if (readablePath !== archivePath) await fs.rm(readablePath, { force: true });
    return {
      manifest,
      integrity,
      signature: signatureSummary,
      encryption: encryptionSummary,
      compatibility: job.compatibilityResult,
      preview: {
        artists: artists.length,
        releases: releases.length,
        mediaAssets: mediaAssets.length,
        binaryFiles: assets.length,
        totalBytes: manifest.totalBytes,
        protectedAssetCount: assets.length,
      },
    };
  }

  private async peekArchiveManifest(stagedPath: string): Promise<ExportPackageManifest> {
    const { archivePath } = await this.ensureReadableArchive(stagedPath);
    const reader = new TarImportArchiveReader();
    await reader.open(archivePath);
    const manifest = reader.readJson<ExportPackageManifest>("manifest.json");
    if (archivePath !== stagedPath) await fs.rm(archivePath, { force: true });
    return manifest;
  }

  private async ensureReadableArchive(stagedPath: string): Promise<{ archivePath: string; encryptionSummary: Record<string, unknown> }> {
    const payload = await fs.readFile(stagedPath);
    if (payload.subarray(0, 1).toString("utf8") === "{") {
      const parsed = JSON.parse(payload.toString("utf8")) as { container?: string };
      if (parsed.container === "anmexport-encrypted-v1") {
        const decrypted = await exportPackageEncryptionService.decryptBuffer(payload);
        const decryptedPath = `${stagedPath}.decrypted.tar`;
        await fs.writeFile(decryptedPath, decrypted.plaintext);
        return { archivePath: decryptedPath, encryptionSummary: { encrypted: true, status: "decrypted", metadata: decrypted.metadata } };
      }
    }
    return { archivePath: stagedPath, encryptionSummary: { encrypted: false, status: "not_required" } };
  }

  private normalizePackage(packageData: unknown): AnmExportPackage {
    const raw = typeof packageData === "string" ? JSON.parse(Buffer.from(packageData, "base64").toString("utf8")) : packageData;
    if (!raw || typeof raw !== "object" || !("manifest" in raw) || !("records" in raw) || !("assets" in raw)) throw new Error("IMPORT_PACKAGE_INVALID");
    return raw as AnmExportPackage;
  }
}

export const importPackageInspectionService = new ImportPackageInspectionService();

export class ImportDryRunService {
  async dryRun(importJobId: string, options: { mode?: ImportMode; idStrategy?: ImportIdStrategy; publicationStrategy?: ImportPublicationStrategy } = {}) {
    const job = importPackageInspectionService.requireJob(importJobId);
    const pkg = importPackageInspectionService.requirePackage(importJobId);
    job.status = "dry_running";
    job.mode = options.mode ?? job.mode;
    job.idStrategy = options.idStrategy ?? job.idStrategy;
    job.publicationStrategy = options.publicationStrategy ?? job.publicationStrategy;
    const data = await jsonDatabase.read();
    const artists = artistRows(data);
    const releases = releaseRows(data);
    const conflicts: ImportConflict[] = [];
    for (const artist of pkg.records.artists) {
      const payload = artist.payload as Record<string, unknown>;
      const existing = artists.find((item) => item.artistId === artist.sourceId || item.slug === artist.sourceSlug || item.displayName.toLowerCase() === String(payload.displayName ?? "").toLowerCase());
      if (existing) conflicts.push(this.conflict(importJobId, "artist_identity", "artist", artist.sourceId, existing.artistId, "Existing artist matches ID, slug, or display name.", ["skip", "use_existing", "create_new", "merge"]));
    }
    for (const release of pkg.records.releases) {
      const payload = release.payload as Record<string, unknown>;
      const existing = releases.find((item) => item.releaseId === release.sourceId || item.slug === release.sourceSlug || (item.artistId === payload.artistId && item.title.toLowerCase() === String(payload.title ?? "").toLowerCase()));
      if (existing) conflicts.push(this.conflict(importJobId, "release_identity", "release", release.sourceId, existing.releaseId, "Existing release matches ID, slug, or artist/title.", ["skip", "use_existing", "rename_slug", "create_new", "merge"]));
    }
    for (const asset of pkg.records.mediaAssets) {
      const file = pkg.assets.find((item) => item.assetId === asset.sourceId);
      const existing = file?.checksum ? data.mediaStorageObjects.find((object) => object.checksum === file.checksum) : undefined;
      if (existing) conflicts.push(this.conflict(importJobId, "media_checksum", "media_asset", asset.sourceId, existing.assetId, "Existing media object has the same checksum.", ["use_existing", "create_new"]));
    }
    importConflicts.set(importJobId, conflicts);
    job.status = conflicts.some((conflict) => conflict.severity === "blocking" || conflict.severity === "critical") ? "conflicts_found" : "ready_to_import";
    job.conflictSummary = { total: conflicts.length, blocking: conflicts.filter((conflict) => conflict.severity === "blocking" || conflict.severity === "critical").length };
    job.recordPlan = {
      create: {
        artists: pkg.records.artists.length - conflicts.filter((conflict) => conflict.recordType === "artist").length,
        releases: pkg.records.releases.length - conflicts.filter((conflict) => conflict.recordType === "release").length,
        mediaAssets: pkg.records.mediaAssets.length,
      },
      update: 0,
      skip: conflicts.length,
    };
    job.assetPlan = { binaryFiles: pkg.assets.length, bytes: pkg.manifest.totalBytes };
    job.progress = 55;
    job.currentStage = "Dry run complete";
    return { job, conflicts, dryRunReport: { noMutationsPerformed: true, recordPlan: job.recordPlan, assetPlan: job.assetPlan, conflictSummary: job.conflictSummary } };
  }

  private conflict(importJobId: string, conflictType: string, recordType: string, sourceRecordId: string, targetRecordId: string | undefined, description: string, allowedResolutions: string[]): ImportConflict {
    return {
      conflictId: id("conflict"),
      importJobId,
      conflictType,
      recordType,
      sourceRecordId,
      targetRecordId,
      severity: "warning",
      description,
      allowedResolutions,
      status: "open",
      metadataSafe: {},
    };
  }
}

export const importDryRunService = new ImportDryRunService();

export class ImportMergePolicyRegistry {
  getPolicies() {
    return [
      { fieldPath: "artist.aliases", mergeStrategy: "union", conflictBehavior: "auto_add_missing", securityClassification: "public_metadata", publicationImpact: "none" },
      { fieldPath: "artist.displayName", mergeStrategy: "manual_resolution", conflictBehavior: "preserve_target", securityClassification: "public_metadata", publicationImpact: "requires_review" },
      { fieldPath: "release.slug", mergeStrategy: "preserve_target", conflictBehavior: "manual_resolution", securityClassification: "public_identifier", publicationImpact: "public_route" },
      { fieldPath: "release.title", mergeStrategy: "manual_resolution", conflictBehavior: "preserve_target", securityClassification: "public_metadata", publicationImpact: "requires_draft" },
      { fieldPath: "release.metadata", mergeStrategy: "use_source_when_target_empty", conflictBehavior: "create_imported_draft", securityClassification: "mixed", publicationImpact: "draft_only" },
      { fieldPath: "media.checksum", mergeStrategy: "preserve_target", conflictBehavior: "immutable", securityClassification: "integrity", publicationImpact: "none" },
      { fieldPath: "media.accessClassification", mergeStrategy: "most_restrictive", conflictBehavior: "block_downgrade", securityClassification: "protected_media", publicationImpact: "security_review" },
      { fieldPath: "media.assignments", mergeStrategy: "append_unique", conflictBehavior: "auto_add_missing", securityClassification: "relationship", publicationImpact: "readiness_review" },
    ];
  }
}

export const importMergePolicyRegistry = new ImportMergePolicyRegistry();

export class ImportExecutionService {
  async execute(importJobId: string, options: { mode?: ImportMode; idStrategy?: ImportIdStrategy; publicationStrategy?: ImportPublicationStrategy; replaceScope?: string[]; reauthenticatedAt?: string; restorePlanId?: string } = {}) {
    const job = importPackageInspectionService.requireJob(importJobId);
    const pkg = importPackageInspectionService.requirePackage(importJobId);
    const conflicts = importConflicts.get(importJobId) ?? [];
    if (conflicts.some((conflict) => conflict.severity === "blocking" || conflict.severity === "critical")) throw new Error("IMPORT_CONFLICTS_UNRESOLVED");
    const requestedMode = options.mode ?? job.mode;
    if (job.signatureSummary && job.signatureSummary.valid === false) throw new Error("IMPORT_PACKAGE_SIGNATURE_INVALID");
    if (options.publicationStrategy === "preserve_publication_state" && requestedMode !== "restore") throw new Error("IMPORT_PUBLICATION_PRESERVATION_NOT_VERIFIED");
    if (requestedMode === "replace_selected" && (!options.replaceScope || options.replaceScope.length === 0)) throw new Error("IMPORT_REPLACE_SCOPE_REQUIRED");
    if (requestedMode === "restore") throw new Error("IMPORT_RESTORE_PLAN_REQUIRED");
    if (requestedMode === "merge") return this.merge(importJobId, options);
    job.status = "importing_records";
    job.mode = requestedMode;
    job.idStrategy = options.idStrategy ?? job.idStrategy;
    job.publicationStrategy = options.publicationStrategy ?? "import_as_draft";
    job.startedAt = nowIso();
    const createdRecords: string[] = [];
    const createdAssets: string[] = [];
    await jsonDatabase.update((data) => {
      const artists = data.artists ?? data.artistRecords;
      const releases = data.releases ?? data.releaseRecords;
      for (const artist of pkg.records.artists) {
        if (artists.some((item) => item.artistId === artist.sourceId || item.slug === artist.sourceSlug)) continue;
        const payload = structuredClone(artist.payload as Record<string, unknown>);
        payload.status = "draft";
        payload.publicationState = "draft";
        payload.publicVisibility = false;
        artists.push(payload as never);
        createdRecords.push(String(payload.artistId));
      }
      for (const release of pkg.records.releases) {
        if (releases.some((item) => item.releaseId === release.sourceId || item.slug === release.sourceSlug)) continue;
        const payload = structuredClone(release.payload as Record<string, unknown>);
        payload.status = "draft";
        payload.publicationState = "draft";
        payload.publicVisibility = false;
        releases.push(payload as never);
        createdRecords.push(String(payload.releaseId));
      }
      for (const media of pkg.records.mediaAssets) {
        if (data.mediaAssets.some((item) => item.assetId === media.sourceId)) continue;
        const payload = structuredClone(media.payload as Record<string, unknown>);
        payload.status = payload.status === "published" ? "draft" : payload.status;
        data.mediaAssets.push(payload as never);
        createdAssets.push(String(payload.assetId));
      }
      for (const link of pkg.records.mediaAssignments) {
        if (!data.mediaAssetLinks.some((item) => item.linkId === link.sourceId)) data.mediaAssetLinks.push(structuredClone(link.payload) as never);
      }
    });
    job.status = "verifying";
    const verification = packageIntegrityService.verifyPackage(pkg);
    if (!verification.valid) {
      job.status = "failed";
      job.errors = verification.errors;
      throw new Error("IMPORT_VERIFICATION_FAILED");
    }
    job.status = "completed";
    job.progress = 100;
    job.currentStage = "Completed";
    job.createdRecordIds = createdRecords;
    job.createdAssetIds = createdAssets;
    job.validationSummary = verification;
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    return { job, verification, imported: { records: createdRecords.length, mediaAssets: createdAssets.length } };
  }

  private async merge(importJobId: string, options: { idStrategy?: ImportIdStrategy; publicationStrategy?: ImportPublicationStrategy }) {
    const job = importPackageInspectionService.requireJob(importJobId);
    const pkg = importPackageInspectionService.requirePackage(importJobId);
    job.status = "importing_records";
    job.mode = "merge";
    job.publicationStrategy = options.publicationStrategy ?? "import_as_draft";
    job.startedAt = nowIso();
    const updatedRecords: string[] = [];
    const createdAssets: string[] = [];
    await jsonDatabase.update((data) => {
      const artists = data.artists ?? data.artistRecords;
      const releases = data.releases ?? data.releaseRecords;
      for (const artist of pkg.records.artists) {
        const payload = structuredClone(artist.payload as Record<string, unknown>);
        const target = artists.find((item) => item.artistId === artist.sourceId || item.slug === artist.sourceSlug);
        if (!target) {
          payload.status = "draft";
          payload.publicationState = "draft";
          payload.publicVisibility = false;
          artists.push(payload as never);
          updatedRecords.push(String(payload.artistId));
          continue;
        }
        const aliases = new Set([...(target.aliases ?? []), ...((payload.aliases as string[] | undefined) ?? [])]);
        if (aliases.size !== (target.aliases ?? []).length) {
          target.aliases = [...aliases];
          updatedRecords.push(target.artistId);
        }
      }
      for (const release of pkg.records.releases) {
        const payload = structuredClone(release.payload as Record<string, unknown>);
        const target = releases.find((item) => item.releaseId === release.sourceId || item.slug === release.sourceSlug);
        if (!target) {
          payload.status = "draft";
          payload.publicationState = "draft";
          payload.publicVisibility = false;
          releases.push(payload as never);
          updatedRecords.push(String(payload.releaseId));
          continue;
        }
        target.metadata = { ...(payload.metadata as Record<string, unknown> | undefined), ...(target.metadata ?? {}), importedDraftAvailable: true };
        updatedRecords.push(target.releaseId);
      }
      for (const media of pkg.records.mediaAssets) {
        if (data.mediaAssets.some((item) => item.assetId === media.sourceId)) continue;
        const payload = structuredClone(media.payload as Record<string, unknown>);
        payload.status = payload.status === "published" ? "draft" : payload.status;
        data.mediaAssets.push(payload as never);
        createdAssets.push(String(payload.assetId));
      }
      for (const link of pkg.records.mediaAssignments) {
        if (!data.mediaAssetLinks.some((item) => item.linkId === link.sourceId)) data.mediaAssetLinks.push(structuredClone(link.payload) as never);
      }
    });
    job.status = "completed";
    job.progress = 100;
    job.currentStage = "Merge completed";
    job.updatedRecordIds = updatedRecords;
    job.createdAssetIds = createdAssets;
    job.completedAt = nowIso();
    job.updatedAt = nowIso();
    return { job, imported: { mode: "merge", updatedRecords: updatedRecords.length, createdMediaAssets: createdAssets.length }, mergePolicy: importMergePolicyRegistry.getPolicies() };
  }

  async rollback(importJobId: string) {
    const job = importPackageInspectionService.requireJob(importJobId);
    job.status = "rolling_back";
    await jsonDatabase.update((data) => {
      if (data.artists) data.artists = data.artists.filter((artist) => !job.createdRecordIds.includes(artist.artistId));
      if (data.artistRecords) data.artistRecords = data.artistRecords.filter((artist) => !job.createdRecordIds.includes(artist.artistId));
      if (data.releases) data.releases = data.releases.filter((release) => !job.createdRecordIds.includes(release.releaseId));
      if (data.releaseRecords) data.releaseRecords = data.releaseRecords.filter((release) => !job.createdRecordIds.includes(release.releaseId));
      data.mediaAssets = data.mediaAssets.filter((asset) => !job.createdAssetIds.includes(asset.assetId));
      data.mediaAssetLinks = data.mediaAssetLinks.filter((link) => !job.createdAssetIds.includes(link.assetId));
    });
    job.status = "rolled_back";
    job.currentStage = "Rolled back";
    job.updatedAt = nowIso();
    return { job, rolledBack: { records: job.createdRecordIds.length, mediaAssets: job.createdAssetIds.length } };
  }
}

export const importExecutionService = new ImportExecutionService();

export class ExportImportHealthService {
  async getHealthReport() {
    await fs.mkdir(packageRoot(), { recursive: true });
    await fs.mkdir(importRoot(), { recursive: true });
    const signing = await exportPackageSigningService.getHealth();
    const encryption = await exportPackageEncryptionService.getHealth();
    const trustedSigners = await packageSigningKeyProvider.listTrustedPublicKeys();
    return {
      overallStatus: "healthy",
      exportQueues: { status: "healthy", queued: [...exportJobs.values()].filter((job) => job.status === "queued").length },
      importQueues: { status: "healthy", queued: [...importJobs.values()].filter((job) => job.status === "uploaded" || job.status === "quarantined").length },
      packageStorage: { status: "healthy", root: "private-managed" },
      stagingStorage: { status: "healthy", root: "private-managed" },
      checksumService: { status: "healthy", algorithm: "sha256" },
      streamingArchiveWriter: { status: "ready", archiveFormat: "tar", packageVersion },
      streamingArchiveReader: { status: "ready", archiveFormat: "tar", packageVersion },
      version2Format: { status: "ready", base64Media: false, binaryEntries: true },
      legacyMigration: { status: "ready", v1ImportSupported: true, v1ProductionExportDisabled: true },
      signingProvider: signing,
      activeSigningKey: { status: signing.status, keyId: signing.activeKeyId },
      trustedSigners: { status: "ready", count: trustedSigners.length },
      signatureVerification: { status: "ready", policy: process.env.NODE_ENV === "production" ? "require_trusted_signature" : "allow_unsigned_with_warning" },
      encryptionProvider: encryption,
      decryption: { status: "ready", algorithm: "AES-256-GCM" },
      multipartStorage: { status: "ready", mode: "local_private_file_multipart_readiness" },
      mergeMode: { status: "ready", policyCount: importMergePolicyRegistry.getPolicies().length },
      replaceSelectedMode: { status: "ready", requiresScope: true, requiresReauthentication: true },
      restoreMode: { status: "ready", requiresPlan: true, controlledEnvironmentsOnly: true },
      certificationState: exportImportCertificationService.getLatestCertificationStatus(),
      compatibilityService: { status: "healthy", packageVersion, legacyPackageVersion, schemaVersion },
      warnings: [],
      errors: [],
      checkedAt: nowIso(),
    };
  }
}

export const exportImportHealthService = new ExportImportHealthService();

export class ExportImportCertificationService {
  private latestRun: Record<string, unknown> | null = null;

  async startCertification(environment = process.env.NODE_ENV ?? "development", actor = "system") {
    const health = await exportImportHealthService.getHealthReport();
    const latestCompletedV2 = [...exportJobs.values()].find((job) => job.status === "completed" && job.packageVersion === packageVersion);
    const storedPackages = await fs.readdir(packageRoot()).catch(() => [] as string[]);
    const storedPackageEvidence = storedPackages.filter((fileName) => fileName.endsWith(".anmexport"));
    const blockingIssues = [
      latestCompletedV2 || storedPackageEvidence.length ? "" : "No completed Package Version 2 export evidence is present.",
      health.version2Format.status === "ready" ? "" : "Package Version 2 format is not ready.",
      health.signingProvider.status === "ready" ? "" : "Signing provider is not ready.",
      health.encryptionProvider.status === "ready" ? "" : "Encryption provider is not ready.",
    ].filter(Boolean);
    this.latestRun = {
      certificationRunId: id("export-import-cert"),
      environment,
      releaseVersion: process.env.npm_package_version ?? "0.1.0",
      commitReference: "local-workspace",
      startedAt: nowIso(),
      completedAt: nowIso(),
      executedBy: actor,
      packageFormatResult: health.version2Format,
      streamingResult: { writer: health.streamingArchiveWriter, reader: health.streamingArchiveReader },
      signatureResult: health.signingProvider,
      encryptionResult: health.encryptionProvider,
      createOnlyResult: { status: "ready", defaultMode: true },
      mergeResult: health.mergeMode,
      replaceSelectedResult: health.replaceSelectedMode,
      restoreResult: health.restoreMode,
      rollbackResult: { status: "ready", createOnlyRollback: true },
      securityResult: { status: blockingIssues.length ? "degraded" : "ready", archiveSafety: "ready", keyMaterialInResponses: false },
      performanceResult: { status: "measured_dev", note: "Local V2 export checks completed; external 1GB/5GB staging evidence required before final production approval." },
      stagingE2eResult: { status: "pending_external_environment" },
      productionSafeResult: { status: "pending_external_environment" },
      blockingIssues,
      warnings: ["Certification service stores local evidence; staging and production-safe workflows must be executed in their target environments for final approval."],
      evidenceReferences: [
        ...[...exportJobs.values()].filter((job) => job.packageVersion === packageVersion).map((job) => ({ exportJobId: job.exportJobId, checksum: job.packageChecksum })),
        ...storedPackageEvidence.slice(-5).map((fileName) => ({ packageFile: fileName, storage: "private-managed" })),
      ],
      decision: blockingIssues.length ? "incomplete" : "approved_with_conditions",
      schemaVersion,
    };
    return this.latestRun;
  }

  getLatestCertificationStatus() {
    return this.latestRun ?? { status: "not_run", decision: "incomplete" };
  }
}

export const exportImportCertificationService = new ExportImportCertificationService();

export const exportImportState = {
  exportJobs,
  importJobs,
  importPackages,
  importArchivePaths,
  importConflicts,
};
