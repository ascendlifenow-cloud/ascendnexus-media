import { MongoClient, type Document } from "mongodb";
import { createHash, randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { isKnownTestMediaFixture, referencesAny } from "../server/services/media/TestMediaFixturePolicy";

const apply = process.argv.includes("--apply");
if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "")) throw new Error("Staging database and explicit staging environment required.");
const backup = process.argv.find((arg) => arg.startsWith("--backup="))?.slice(9);
if (apply && (!process.argv.includes("--confirm-delete-test-media") || !backup?.startsWith("/private/tmp/"))) throw new Error("Apply requires confirmation and a new private temporary backup path.");
const client = new MongoClient(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 10000 });
const runId = randomUUID();
// Preserve audit records. Only fixture-owned operational records may be cascaded.
const cascade = ["media_asset_links", "media_asset_versions", "media_upload_jobs", "media_processing_jobs", "media_intake_records", "direct_media_upload_sessions"];
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const assets = await db.collection("media_assets").find({}).toArray();
  const fixtures = assets.filter(isKnownTestMediaFixture);
  const fixtureIds = new Set(fixtures.map((asset) => asset.assetId));
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((entry) => entry.name);
  const owned: Record<string, Document[]> = {};
  for (const name of cascade.filter((name) => collections.includes(name))) owned[name] = await db.collection(name).find({ $or: [{ assetId: { $in: [...fixtureIds] } }, { mediaAssetId: { $in: [...fixtureIds] } }] }).toArray();
  const blockers: { assetId: string; reason: string }[] = [];
  // Inspect every non-audit application collection for exact fixture IDs or delivery URLs.
  const identifiers = new Map(fixtures.map((asset) => [asset.assetId, new Set<string>([asset.assetId, ...[asset.url, asset.thumbnailUrl, asset.largeUrl].filter((value): value is string => typeof value === "string" && Boolean(value))])]));
  const outside = collections.filter((name) => name !== "media_assets" && !cascade.includes(name) && !/audit|history|events|logs/i.test(name));
  for (const name of outside) {
    for await (const record of db.collection(name).find({})) {
      for (const asset of fixtures) if (referencesAny(record, identifiers.get(asset.assetId)!)) blockers.push({ assetId: asset.assetId, reason: `Referenced by ${name}; retain for explicit review.` });
    }
  }
  for (const asset of fixtures) {
    if (assets.some((other) => !fixtureIds.has(other.assetId) && referencesAny(other, identifiers.get(asset.assetId)!))) blockers.push({ assetId: asset.assetId, reason: "Referenced by non-test media; retained." });
    if (Object.values(owned).flat().some((record) => (record.assetId === asset.assetId || record.mediaAssetId === asset.assetId) && ["running", "processing", "uploading"].includes(record.status))) blockers.push({ assetId: asset.assetId, reason: "Active media job requires cancellation before deletion." });
  }
  const eligible = fixtures.filter((asset) => !blockers.some((blocker) => blocker.assetId === asset.assetId));
  const eligibleIds = eligible.map((asset) => asset.assetId);
  const fingerprint = async (session?: import("mongodb").ClientSession) => {
    const hash = createHash("sha256");
    for (const name of ["artists", "song_releases", "gallery_items", "media_storage_objects", "media_assets"]) {
      if (!collections.includes(name)) continue;
      const filter = name === "media_assets" ? { assetId: { $nin: eligibleIds } } : {};
      hash.update(JSON.stringify(await db.collection(name).find(filter, { session }).sort({ _id: 1 }).toArray()));
    }
    return hash.digest("hex");
  };
  const safetyBefore = await fingerprint();
  let deleted = 0;
  let cascaded = 0;
  if (apply && eligible.length) {
    const records = Object.fromEntries(Object.entries(owned).map(([name, rows]) => [name, rows.filter((row) => eligibleIds.includes(row.assetId ?? row.mediaAssetId))]));
    await writeFile(backup!, JSON.stringify({ runId, environment: "staging", createdAt: new Date().toISOString(), media_assets: eligible, ...records }, null, 2), { mode: 0o600, flag: "wx" });
    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        if (await fingerprint(session) !== safetyBefore) throw new Error("Non-test content changed; stopped.");
        for (const asset of eligible) {
          const current = await db.collection("media_assets").findOne({ _id: asset._id }, { session });
          if (JSON.stringify(current) !== JSON.stringify(asset)) throw new Error("Fixture changed; stopped.");
        }
        // Recheck external references inside the transaction, not just at planning time.
        const eligibleReferences = new Set(eligible.flatMap((asset) => [...identifiers.get(asset.assetId)!]));
        for (const name of outside) for await (const row of db.collection(name).find({}, { session })) if (referencesAny(row, eligibleReferences)) throw new Error("New reference detected; stopped.");
        for (const [name, rows] of Object.entries(records)) {
          for (const row of rows) {
            const current = await db.collection(name).findOne({ _id: row._id }, { session });
            if (JSON.stringify(current) !== JSON.stringify(row)) throw new Error("Operational record changed; stopped.");
          }
          await db.collection(name).deleteMany({ _id: { $in: rows.map((row) => row._id) } }, { session });
        }
        const result = await db.collection("media_assets").deleteMany({ _id: { $in: eligible.map((asset) => asset._id) } }, { session });
        if (result.deletedCount !== eligible.length) throw new Error("Fixture count changed; stopped.");
        await db.collection("admin_audit_events").insertOne({ auditEventId: randomUUID(), action: "staging_test_media_cleanup_completed", entityType: "media", actorId: "operator:codex-user-request", summary: "User-approved removal of verified test media fixtures.", createdAt: new Date().toISOString(), metadata: { runId, deleted: eligible.length, assetIds: eligibleIds, cascaded: Object.values(records).flat().length, storageObjectsDeleted: 0 } }, { session });
      });
      deleted = eligible.length;
      cascaded = Object.values(records).flat().length;
    } finally { await session.endSession(); }
  }
  const contentAndNonTestMediaUnchanged = safetyBefore === await fingerprint();
  if (!contentAndNonTestMediaUnchanged) process.exitCode = 1;
  console.log(JSON.stringify({ environment: "staging", runId, apply, candidates: fixtures.length, eligible: eligible.length, deleted, cascaded, storageObjectsDeleted: 0, contentAndNonTestMediaUnchanged, blockers, remainingAssignments: await db.collection("media_assets").aggregate([{ $group: { _id: "$assignmentStatus", count: { $sum: 1 } } }]).toArray() }, null, 2));
} catch {
  console.error(JSON.stringify({ environment: "staging", runId, error: "Test cleanup stopped safely. Check audit records and private backup before retrying." }));
  process.exitCode = 1;
} finally { await client.close(); }
