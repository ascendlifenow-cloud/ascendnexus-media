import { MongoClient } from "mongodb";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";

if (!process.argv.includes("--environment=staging") || !/stag(?:ing|ging)/i.test(process.env.MONGODB_DATABASE ?? "")) throw new Error("Explicit staging configuration required.");
const client = new MongoClient(process.env.MONGODB_URI ?? "", { serverSelectionTimeoutMS: 10000 });
const reportPath = process.argv.find((arg) => arg.startsWith("--report="))?.slice(9);
const cache = new Map<string, Promise<{ hash?: string; reason: string }>>();
const hashApprovedImage = (value: unknown) => {
  if (typeof value !== "string") return Promise.resolve({ reason: "missing_delivery_reference" });
  let url: URL;
  try { url = new URL(value); } catch { return Promise.resolve({ reason: "no_approved_public_delivery_reference" }); }
  if (url.protocol !== "https:" || url.hostname !== "staging-media.ascendnexusmedia.com" || url.username || url.password || url.port || url.search || url.hash || !url.pathname.startsWith("/public/")) return Promise.resolve({ reason: "no_approved_public_delivery_reference" });
  const key = url.href;
  if (!cache.has(key)) cache.set(key, (async () => {
    try {
      const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20000), headers: { "Cache-Control": "no-cache" } });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("image/") || !response.body) { await response.body?.cancel(); return { reason: response.status === 404 ? "object_not_found" : "delivery_unavailable_or_not_image" }; }
      const hash = createHash("sha256");
      const reader = response.body.getReader();
      let size = 0;
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          size += part.value.byteLength;
          if (size > 15 * 1024 * 1024) { await reader.cancel(); return { reason: "verification_size_limit" }; }
          hash.update(part.value);
        }
      } finally { reader.releaseLock(); }
      return size ? { hash: hash.digest("hex"), reason: "bytes_verified" } : { reason: "empty_object" };
    } catch { return { reason: "delivery_request_failed" }; }
  })());
  return cache.get(key)!;
};

try {
  await client.connect();
  const db = client.db(process.env.MONGODB_DATABASE);
  const assets = await db.collection("media_assets").find({}).toArray();
  const candidates = assets.filter((a) => a.metadata?.libraryReconciliation?.reason?.startsWith("Matching target already"));
  const artists = await db.collection("artists").find({}).toArray();
  const releases = await db.collection("song_releases").find({}).toArray();
  const results: Record<string, unknown>[] = [];
  for (const asset of candidates) {
    const target = asset.metadata.libraryReconciliation.target;
    const record = target.entityType === "artist" ? artists.find((a) => a.artistId === target.entityId) : releases.find((r) => r.releaseId === target.entityId);
    if (!record || !["coverArtUrl", "profileImage", "characterArtUrl", "profileBannerUrl"].includes(target.fieldKey)) { results.push({ assetId: asset.assetId, status: "manual_review", reason: "unsupported_or_missing_target" }); continue; }
    const field = target.fieldKey;
    const canonicalId = record.metadata?.[field === "coverArtUrl" ? "coverArtAssetId" : `${field}AssetId`];
    const canonical = assets.find((a) => a.assetId === canonicalId);
    const source = await hashApprovedImage(asset.url);
    const current = await hashApprovedImage(record[field] ?? canonical?.url);
    const sameBytes = Boolean(source.hash && current.hash && source.hash === current.hash);
    results.push({ assetId: asset.assetId, targetEntityId: target.entityId, canonicalAssetId: canonical?.assetId ?? null, status: sameBytes ? "byte_identical_duplicate" : source.hash && current.hash ? "different_artwork" : "unverified", candidateDelivery: source.reason, assignedDelivery: current.reason, candidateMatchesRecordedChecksum: source.hash ? source.hash === asset.metadata.checksum : null, recordedCandidateChecksumMatchesAssignedBytes: current.hash ? current.hash === asset.metadata.checksum : null });
  }
  const report = { environment: "staging", checkedAt: new Date().toISOString(), assessed: results.length, mutations: 0, counts: results.reduce<Record<string, number>>((counts, result) => { const status = String(result.status); counts[status] = (counts[status] ?? 0) + 1; return counts; }, {}), items: results };
  if (reportPath) await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ ...report, items: undefined }, null, 2));
} catch {
  console.error("Staging duplicate audit failed; no URLs, paths, or credentials logged.");
  process.exitCode = 1;
} finally { await client.close(); }
