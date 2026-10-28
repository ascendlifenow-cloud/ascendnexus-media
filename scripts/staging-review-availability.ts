import { MongoClient } from "mongodb";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";

if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "")) throw new Error("Staging configuration required.");
const apply = process.argv.includes("--apply-diagnostics");
const reportPath = process.argv.find((arg) => arg.startsWith("--report="))?.slice(9);
const client = new MongoClient(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 10000 });
async function check(value: unknown) {
  if (typeof value !== "string") return { state: "no_approved_reference" };
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "staging-media.ascendnexusmedia.com" || url.port || url.username || url.password || url.search || url.hash || !url.pathname.startsWith("/public/")) return { state: "no_approved_reference" };
    const response = await fetch(url, { method: "HEAD", redirect: "error", signal: AbortSignal.timeout(15000), headers: { "Cache-Control": "no-cache" } });
    return { state: response.ok ? "available" : response.status === 404 ? "missing" : "unavailable", status: response.status };
  } catch { return { state: "unavailable" }; }
}
try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const assets = await db.collection("media_assets").find({ status: { $nin: ["archived", "deleted"] } }).toArray();
  const releases = await db.collection("song_releases").find({}).toArray();
  const items = [];
  for (const asset of assets.filter((asset) => asset.assignmentStatus === "unassigned")) {
    const source = await check(asset.assetType === "full_song" ? undefined : asset.url);
    const canonical = assets.filter((item) => item.assignmentStatus === "assigned" && /^[a-f0-9]{64}$/i.test(asset.metadata?.checksum ?? "") && item.metadata?.checksum === asset.metadata.checksum);
    const release = canonical.length === 1 ? releases.find((item) => item.metadata?.audioPreviewAssetId === canonical[0].assetId) : undefined;
    const assignedPreview = asset.assetType === "audio_preview" ? await check(release?.audioPreviewUrl) : undefined;
    const reason = asset.assetType === "audio_preview"
      ? assignedPreview?.state === "available" ? "Assigned preview is available but duplicate identity could not be verified. Keep current preview or review a replacement." : "Preview delivery could not be verified. Regenerate from the assigned full song or re-upload the original preview before assignment."
      : source.state === "available" ? "Artwork is available; review the destination and existing artwork before replacement." : "Original artwork delivery is unavailable. Re-upload this file before assignment; current artwork was preserved.";
    if (apply && asset.metadata?.libraryReconciliation?.reason !== reason) {
      const session = client.startSession();
      try {
        await session.withTransaction(async () => {
          const result = await db.collection("media_assets").updateOne({ _id: asset._id, status: asset.status, assignmentStatus: "unassigned", updatedAt: asset.updatedAt }, { $set: { "metadata.libraryReconciliation.reason": reason, "metadata.libraryAvailability": { source: source.state, assignedPreview: assignedPreview?.state ?? null, checkedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() } }, { session });
          if (result.matchedCount !== 1) throw new Error("Asset changed; stopped.");
          await db.collection("admin_audit_events").insertOne({ auditEventId: randomUUID(), action: "media_review_availability_checked", entityType: "media_asset", entityId: asset.assetId, actorId: "operator:codex-user-request", summary: reason, createdAt: new Date().toISOString(), metadata: { source: source.state, assignedPreview: assignedPreview?.state ?? null } }, { session });
        });
      } finally { await session.endSession(); }
    }
    items.push({ assetId: asset.assetId, title: asset.title, type: asset.assetType, source, assignedPreview, reason });
  }
  if (reportPath) await writeFile(reportPath, JSON.stringify({ environment: "staging", items }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ environment: "staging", remaining: items.length, types: items.reduce<Record<string, number>>((counts, item) => { counts[item.type] = (counts[item.type] ?? 0) + 1; return counts; }, {}), sourceAvailable: items.filter((item) => item.source.state === "available").length, assignedPreviewsAvailable: items.filter((item) => item.assignedPreview?.state === "available").length, diagnosticsApplied: apply }, null, 2));
} catch {
  console.error("Staging availability check stopped; no URLs or credentials logged.");
  process.exitCode = 1;
} finally { await client.close(); }
