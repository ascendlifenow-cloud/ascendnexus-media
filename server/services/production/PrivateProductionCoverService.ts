import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { jsonDatabase } from "../media/JsonDatabase";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { resolveInsideRoot } from "../../utils/media/mediaPathUtils";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";

const unavailable = (details?: { check: string; upstreamStatus?: number }) => new MediaApiError("PRODUCTION_COVER_UNAVAILABLE", "Private artwork is unavailable. Please retry later.", 404, "storage", false, details);
const imageTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/avif"]);

export async function readPrivateProductionCover(releaseId: string) {
  const diagnostic: { check: string; upstreamStatus?: number } = { check: "release" };
  try { return await readCover(releaseId, diagnostic); }
  catch { throw unavailable(diagnostic); }
}

async function readCover(releaseId: string, diagnostic: { check: string; upstreamStatus?: number }) {
  const release = await jsonDatabase.findCollectionRecord("releaseRecords", { releaseId });
  if (!release || release.status !== "draft" || release.publicationState !== "draft" || release.publicVisibility !== false) throw unavailable();
  diagnostic.check = "asset_manifest";
  const manifest = (release.metadata?.productionPackage as { assets?: { assetId: string; role: string; sha256: string }[] } | undefined)?.assets?.find((asset) => asset.role === "artwork");
  if (!manifest) throw unavailable();
  const asset = await jsonDatabase.findCollectionRecord("mediaAssets", { assetId: manifest.assetId });
  if (!asset || asset.status !== "draft" || asset.assetType !== "cover_art" || asset.metadata?.deletedAt) throw unavailable();
  diagnostic.check = "asset_link";
  const links = await jsonDatabase.listCollection("mediaAssetLinks");
  if (!links.some((link) => link.entityId === releaseId && link.assetId === manifest.assetId && link.fieldKey === "coverArt" && link.status === "active")) throw unavailable();
  diagnostic.check = "private_storage";
  const objects = (await jsonDatabase.listCollection("mediaStorageObjects")).filter((object) => object.assetId === manifest.assetId && ["ready", "uploaded"].includes(object.status) && ["private", "admin_only", "signed"].includes(object.accessLevel) && object.checksum === manifest.sha256);
  if (objects.length !== 1 || !imageTypes.has(objects[0].mimeType)) throw unavailable();
  diagnostic.check = "storage_provider";
  const provider = backendStorageProviderRegistry.getActiveProvider();
  let source: AsyncIterable<Uint8Array>;
  if (provider.getProviderName() === "local") {
    source = createReadStream(resolveInsideRoot(mediaBackendConfig.uploadRoot, objects[0].storagePath));
  } else {
    diagnostic.check = "storage_signing";
    const signed = await provider.getSignedUrl(objects[0], 60, "admin_preview");
    if (!signed) throw unavailable();
    diagnostic.check = "storage_read";
    const response = await fetch(signed, { signal: AbortSignal.timeout(15000), redirect: "error" });
    diagnostic.upstreamStatus = response.status;
    if (!response.ok || !response.body) throw unavailable();
    source = Readable.fromWeb(response.body as never);
  }
  const maximumBytes = 20 * 1024 * 1024;
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const value of source) {
    length += value.byteLength;
    if (length > maximumBytes) throw unavailable();
    chunks.push(Buffer.from(value));
  }
  const bytes = Buffer.concat(chunks);
  diagnostic.check = "checksum";
  if (createHash("sha256").update(bytes).digest("hex") !== manifest.sha256) throw unavailable();
  return { bytes, mimeType: objects[0].mimeType };
}
