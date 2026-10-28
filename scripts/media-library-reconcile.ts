import { MongoClient } from "mongodb";
import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { planMediaLibraryReconciliation, type ReconciliationAsset, type ReconciliationLink, type ReconciliationTarget } from "../server/services/media/MediaLibraryReconciliationPlanner";

const apply = process.argv.includes("--apply");
if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "")) throw new Error("Explicit staging environment and staging database required.");
if (apply && !process.argv.includes("--confirm-staging")) throw new Error("Apply requires --confirm-staging.");
const client = new MongoClient(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 10000 });
const runId = randomUUID();
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const safetyFingerprint = async () => {
    const hash = createHash("sha256");
    for (const name of ["artists", "song_releases", "media_storage_objects"]) {
      const records = await db.collection(name).find({}).sort({ _id: 1 }).toArray();
      hash.update(JSON.stringify(records));
    }
    const delivery = await db.collection("media_assets").find({}, { projection: { assetId: 1, url: 1, thumbnailUrl: 1, largeUrl: 1, accessLevel: 1, publicVisibility: 1, status: 1 } }).sort({ _id: 1 }).toArray();
    hash.update(JSON.stringify(delivery));
    return hash.digest("hex");
  };
  const safetyBefore = await safetyFingerprint();
  const snapshot = async (session?: import("mongodb").ClientSession) => {
    const options = session ? { session } : {};
    const assets = await db.collection("media_assets").find({}, { ...options, projection: { assetId: 1, title: 1, assetType: 1, status: 1, assignmentStatus: 1, url: 1 } }).toArray();
    const projection = { artistId: 1, releaseId: 1, name: 1, displayName: 1, title: 1, status: 1, coverArtUrl: 1, audioPreviewUrl: 1, profileImage: 1, characterArtUrl: 1, profileBannerUrl: 1, "metadata.coverArtAssetId": 1, "metadata.audioPreviewAssetId": 1, "metadata.fullSongAssetId": 1, "metadata.profileImageAssetId": 1, "metadata.characterArtUrlAssetId": 1, "metadata.profileBannerUrlAssetId": 1 };
    const artists = await db.collection("artists").find({}, { ...options, projection }).toArray();
    const releases = await db.collection("song_releases").find({}, { ...options, projection }).toArray();
    const links = await db.collection("media_asset_links").find({ status: "active" }, options).toArray();
    const targets = [...artists.map((a) => ({ entityType: "artist", entityId: a.artistId, label: a.name ?? a.displayName ?? "", status: a.status, fields: a, metadata: a.metadata })), ...releases.map((r) => ({ entityType: "release", entityId: r.releaseId, label: r.title ?? "", status: r.status, fields: r, metadata: r.metadata }))] as ReconciliationTarget[];
    return planMediaLibraryReconciliation(assets as unknown as ReconciliationAsset[], targets, links as unknown as ReconciliationLink[]);
  };
  const plan = await snapshot();
  let reconciled = 0;
  let reviewed = 0;
  let unchanged = 0;
  if (apply) {
    for (const proposed of plan) {
      const asset = await db.collection("media_assets").findOne({ assetId: proposed.assetId });
      const prior = asset?.metadata?.libraryReconciliation;
      if (proposed.outcome === "review" && prior && prior.reason === proposed.reason && prior.score === proposed.score && JSON.stringify(prior.target) === JSON.stringify(proposed.target)) { unchanged++; continue; }
      const session = client.startSession();
      try {
        const outcome = await session.withTransaction(async () => {
          const current = (await snapshot(session)).find((item) => item.assetId === proposed.assetId);
          if (!current || JSON.stringify(current) !== JSON.stringify(proposed)) throw new Error("Assignment changed since dry run; stopped safely.");
          const now = new Date().toISOString();
          const patch: Record<string, unknown> = { "metadata.libraryReconciliation": { runId, ...current, checkedAt: now }, updatedAt: now };
          if (current.outcome === "reconcile" && current.target) {
            const target = current.target;
            const existing = await db.collection("media_asset_links").findOne({ assetId: current.assetId, ...target, status: "active" }, { session });
            if (!existing) await db.collection("media_asset_links").insertOne({ linkId: randomUUID(), assetId: current.assetId, ...target, status: "active", createdAt: now, metadata: { source: "library_reconciliation", runId } }, { session });
            Object.assign(patch, { assignmentStatus: "assigned", ownerType: target.entityType, ownerId: target.entityId, "metadata.assignmentStatus": "assigned", "metadata.assignmentReviewStatus": "resolved", "metadata.assignedEntityType": target.entityType, "metadata.assignedEntityId": target.entityId, "metadata.assignedFieldKey": target.fieldKey });
          } else {
            const freshAsset = await db.collection("media_assets").findOne({ assetId: current.assetId }, { session });
            if (!["ignored", "kept_unassigned"].includes(freshAsset?.metadata?.assignmentReviewStatus) && freshAsset?.metadata?.assignmentStatus !== "kept_unassigned") patch["metadata.assignmentReviewStatus"] = "pending";
          }
          const result = await db.collection("media_assets").updateOne({ assetId: current.assetId, assignmentStatus: { $in: ["unassigned", "detached"] } }, { $set: patch }, { session });
          if (result.matchedCount !== 1) throw new Error("Asset changed; stopped safely.");
          await db.collection("admin_audit_events").insertOne({ auditEventId: randomUUID(), action: current.outcome === "reconcile" ? "media_assignment_reconciled" : "media_assignment_review_prepared", entityType: "media_asset", entityId: current.assetId, actorId: "operator:codex-user-request", summary: current.reason, createdAt: now, metadata: { runId, score: current.score, target: current.target ?? null } }, { session });
          return current.outcome;
        });
        if (outcome === "reconcile") reconciled++; else reviewed++;
      } finally { await session.endSession(); }
    }
  }
  const remaining = await snapshot();
  const contentAndDeliveryUnchanged = safetyBefore === await safetyFingerprint();
  if (!contentAndDeliveryUnchanged) process.exitCode = 1;
  const report = { environment: "staging", release: process.env.RELEASE_SHA ?? "operator-worktree", runId, apply, assessed: plan.length, reconciled, reviewed, unchanged, remaining: remaining.length, contentAndDeliveryUnchanged, counts: plan.reduce<Record<string, number>>((counts, item) => { counts[item.reason] = (counts[item.reason] ?? 0) + 1; return counts; }, {}), items: plan };
  const reportArg = process.argv.find((arg) => arg.startsWith("--report="));
  if (reportArg) await writeFile(reportArg.slice(9), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
} catch {
  console.error(JSON.stringify({ environment: "staging", runId, error: "Reconciliation stopped. Inspect database/audit state before retrying; no secrets logged." }));
  process.exitCode = 1;
} finally { await client.close(); }
