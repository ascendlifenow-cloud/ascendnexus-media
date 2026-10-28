import { randomUUID, createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { jsonDatabase, type MediaDatabaseShape } from "../media/JsonDatabase";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { resolveInsideRoot } from "../../utils/media/mediaPathUtils";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { hashSecret } from "../../utils/auth/sessionSecurityUtils";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { privateProductionAudio } from "./ProductionFinalAudioService";
import { buildProductionReviewSnapshot } from "./ProductionReleaseGate";
import { productionAudioIdentity } from "./ProductionAudioIdentity";
import { validateSongProductionPackage, type SongProductionPackage } from "./SongProductionContract";

export interface AuditionActor { userId: string; sessionId: string }
const unavailable = () => new MediaApiError("PRODUCTION_AUDITION_UNAVAILABLE", "Private audition is unavailable. Refresh the review or load it again.", 409, "validation");
const maxBytes = Math.min(mediaBackendConfig.maxFullSongBytes, 128 * 1024 * 1024);
const activeReads = new Set<string>();

function bodyFields(input: unknown, allowed: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !allowed.includes(key))) throw unavailable();
  const body = input as Record<string, unknown>;
  if (typeof body.expectedBundleHash !== "string" || !/^[a-f0-9]{64}$/.test(body.expectedBundleHash)) throw unavailable();
  return body;
}

function selectedAudio(data: MediaDatabaseShape, releaseId: string) {
  const release = data.releaseRecords.find((item) => item.releaseId === releaseId);
  if (!release || release.status !== "draft" || release.publicationState !== "draft" || release.publicVisibility !== false || !data.adminAuditEvents.some((item) => item.action === "production_draft_ingested" && item.entityId === releaseId)) throw unavailable();
  const bundle = release.metadata?.productionPackage as SongProductionPackage;
  try { if (!validateSongProductionPackage(bundle).valid) throw unavailable(); } catch { throw unavailable(); }
  if (bundle.title !== release.title || bundle.lyrics !== release.lyrics || bundle.artistId !== release.artistId || bundle.songId !== release.songId) throw unavailable();
  const manifest = bundle.assets.filter((item) => item.role === "final_audio");
  if (manifest.length !== 1) throw unavailable();
  const links = data.mediaAssetLinks.filter((item) => item.entityType === "release" && item.entityId === releaseId && item.status === "active" && ["fullSongUrl", "fullSongAssetId"].includes(item.fieldKey));
  if (links.length !== 1 || links[0].assetId !== manifest[0].assetId) throw unavailable();
  const asset = data.mediaAssets.find((item) => item.assetId === manifest[0].assetId);
  const storage = asset && privateProductionAudio(asset, data.mediaStorageObjects, data.mediaAssetLinks, releaseId);
  if (!asset || !storage || storage.checksum !== manifest[0].sha256 || storage.fileSizeBytes > maxBytes || !data.adminAuditEvents.some((event) => event.action === "production_asset_enrolled" && event.entityId === asset.assetId)) throw unavailable();
  if (data.mediaIntakeRecords.some((item) => item.mediaAssetId === asset.assetId && ["quarantined", "failed", "ignored", "superseded"].includes(item.status))) throw unavailable();
  const audioIdentity = productionAudioIdentity(bundle, storage.storageObjectId)!;
  const snapshot = buildProductionReviewSnapshot(release, data, data.artistRecords.find((item) => item.artistId === release.artistId));
  return { release, storage, asset, bundle, audioIdentity, bundleHash: snapshot.bundleHash };
}

function validateReference(data: MediaDatabaseShape, releaseId: string, reference: unknown, actor: AuditionActor, expectedBundleHash?: string) {
  if (typeof reference !== "string" || !/^audition-[0-9a-f-]{36}$/.test(reference) || !actor.sessionId) throw unavailable();
  const event = data.adminAuditEvents.find((item) => item.auditEventId === reference && item.action === "production_audition_authorized" && item.entityId === releaseId && item.actorId === actor.userId);
  if (!event || event.metadata?.sessionHash !== hashSecret(actor.sessionId) || typeof event.metadata?.expiresAt !== "string" || !Number.isFinite(Date.parse(event.metadata.expiresAt)) || Date.parse(event.metadata.expiresAt) <= Date.now()) throw unavailable();
  const audio = selectedAudio(data, releaseId);
  if (audio.audioIdentity !== event.metadata.audioIdentity || audio.bundleHash !== event.metadata.bundleHash || (expectedBundleHash && audio.bundleHash !== expectedBundleHash)) throw unavailable();
  return { event, audio };
}

export async function authorizeProductionAudition(releaseId: string, input: unknown, actor: AuditionActor) {
  const body = bodyFields(input, ["expectedBundleHash"]);
  if (!actor.sessionId) throw unavailable();
  const reference = `audition-${randomUUID()}`;
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  let revision = 0;
  await jsonDatabase.update((data) => {
    const audio = selectedAudio(data, releaseId);
    if (audio.bundleHash !== body.expectedBundleHash) throw unavailable();
    const recent = data.adminAuditEvents.filter((event) => event.action === "production_audition_authorized" && event.actorId === actor.userId && Date.parse(event.createdAt) > Date.now() - 60_000);
    if (recent.length >= 5) throw unavailable();
    revision = audio.bundle.revision;
    data.adminAuditEvents.push({ auditEventId: reference, action: "production_audition_authorized", actorId: actor.userId, entityType: "release", entityId: releaseId, summary: "Private reviewer audition authorized; not release approval.", createdAt: new Date().toISOString(), metadata: { audioIdentity: audio.audioIdentity, bundleHash: audio.bundleHash, sessionHash: hashSecret(actor.sessionId), expiresAt, readCount: 0 } });
  });
  return { reference, expiresAt, revision };
}

export async function checkProductionAudition(releaseId: string, input: unknown, actor: AuditionActor) {
  const body = bodyFields(input, ["expectedBundleHash", "reference"]);
  validateReference(await jsonDatabase.read(), releaseId, body.reference, actor, body.expectedBundleHash as string);
  return { valid: true };
}

export async function readProductionAudition(releaseId: string, reference: string, actor: AuditionActor) {
  if (activeReads.size >= 1) throw unavailable();
  activeReads.add(actor.sessionId);
  try {
    let audio!: ReturnType<typeof selectedAudio>;
    await jsonDatabase.update((data) => {
      const validated = validateReference(data, releaseId, reference, actor);
      audio = validated.audio;
      const count = Number(validated.event.metadata?.readCount ?? 0);
      if (count >= 2) throw unavailable();
      validated.event.metadata = { ...validated.event.metadata, readCount: count + 1 };
    });
    const provider = backendStorageProviderRegistry.getActiveProvider();
    if (provider.getProviderName() !== audio.storage.provider) throw unavailable();
    let source: AsyncIterable<Uint8Array>;
    const abort = new AbortController();
    const deadline = setTimeout(() => abort.abort(), 60_000);
    try {
      if (provider.getProviderName() === "local") source = createReadStream(resolveInsideRoot(mediaBackendConfig.uploadRoot, audio.storage.storagePath), { signal: abort.signal });
      else {
        const signed = await provider.getSignedUrl(audio.storage, 60, "admin_preview");
        if (!signed) throw unavailable();
        const response = await fetch(signed, { signal: abort.signal, redirect: "error" });
        if (!response.ok || !response.body) throw unavailable();
        source = Readable.fromWeb(response.body as never);
      }
      const chunks: Buffer[] = [];
      const digest = createHash("sha256");
      let length = 0;
      for await (const chunk of source) {
        length += chunk.byteLength;
        if (length > maxBytes || length > audio.storage.fileSizeBytes) throw unavailable();
        digest.update(chunk); chunks.push(Buffer.from(chunk));
      }
      if (length !== audio.storage.fileSizeBytes || digest.digest("hex") !== audio.storage.checksum) throw unavailable();
      await jsonDatabase.update((data) => {
        const current = validateReference(data, releaseId, reference, actor);
        current.event.metadata = { ...current.event.metadata, bytesVerifiedAt: new Date().toISOString() };
      });
      return { bytes: Buffer.concat(chunks), mimeType: audio.storage.mimeType };
    } finally { clearTimeout(deadline); }
  } catch { throw unavailable(); }
  finally { activeReads.delete(actor.sessionId); }
}

export async function acknowledgeProductionAudio(releaseId: string, input: unknown, actor: AuditionActor) {
  const body = bodyFields(input, ["expectedBundleHash", "reference", "confirmed"]);
  if (body.confirmed !== true) throw unavailable();
  let reused = false;
  await jsonDatabase.update((data) => {
    const { event, audio } = validateReference(data, releaseId, body.reference, actor, body.expectedBundleHash as string);
    if (!event.metadata?.bytesVerifiedAt) throw unavailable();
    const id = `audio-review-${createHash("sha256").update(JSON.stringify([releaseId, audio.audioIdentity, actor.userId])).digest("hex")}`;
    if (data.adminAuditEvents.some((item) => item.auditEventId === id)) { reused = true; return; }
    data.adminAuditEvents.push({ auditEventId: id, action: "production_audio_reviewed", actorId: actor.userId, entityType: "release", entityId: releaseId, summary: "Reviewer explicitly acknowledged audition of the exact audio revision; not release approval.", createdAt: new Date().toISOString(), metadata: { audioIdentity: audio.audioIdentity, revision: audio.bundle.revision, assetId: audio.asset.assetId } });
  });
  return { reviewed: true, reused };
}
