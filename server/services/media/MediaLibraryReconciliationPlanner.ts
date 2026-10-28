export interface ReconciliationAsset {
  assetId: string;
  title: string;
  assetType: string;
  status: string;
  assignmentStatus?: string;
  url?: string;
  metadata?: Record<string, unknown>;
}
export interface ReconciliationTarget {
  entityType: "artist" | "release";
  entityId: string;
  label: string;
  status: string;
  fields: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
export interface ReconciliationLink {
  assetId: string;
  entityType: string;
  entityId: string;
  fieldKey: string;
  status: string;
}
export interface ReconciliationItem {
  assetId: string;
  outcome: "reconcile" | "review";
  reason: string;
  score: number;
  target?: { entityType: "artist" | "release"; entityId: string; fieldKey: string };
}
const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const fields = ["coverArtUrl", "audioPreviewUrl", "fullSongUrl", "profileImage", "characterArtUrl", "profileBannerUrl"];
const metadataKey = (field: string) => field === "coverArtUrl" ? "coverArtAssetId" : field === "audioPreviewUrl" ? "audioPreviewAssetId" : field === "fullSongUrl" ? "fullSongAssetId" : `${field}AssetId`;

// Only existing authoritative references can repair assignments automatically.
// Filename matches are suggestions, never permission to replace a populated slot.
export function planMediaLibraryReconciliation(assets: ReconciliationAsset[], targets: ReconciliationTarget[], links: ReconciliationLink[]): ReconciliationItem[] {
  return assets.filter((a) => ["unassigned", "detached"].includes(a.assignmentStatus ?? "") && !["deleted", "archived"].includes(a.status)).map((asset) => {
    const available = targets.filter((t) => !["deleted", "archived"].includes(t.status));
    const references = available.flatMap((target) => fields.filter((field) =>
      target.metadata?.[metadataKey(field)] === asset.assetId ||
      (field !== "fullSongUrl" && !target.metadata?.[metadataKey(field)] && Boolean(asset.url) && target.fields[field] === asset.url && assets.filter((other) => other.url === asset.url && !["archived", "deleted"].includes(other.status)).length === 1)
    ).map((fieldKey) => ({ entityType: target.entityType, entityId: target.entityId, fieldKey })));
    const active = links.filter((l) => l.assetId === asset.assetId && l.status === "active");
    const confirmed = references.filter((r) => !links.some((l) => l.status === "active" && l.entityType === r.entityType && l.entityId === r.entityId && l.fieldKey === r.fieldKey && l.assetId !== asset.assetId));
    if (confirmed.length === 1 && references.length === 1 && active.every((l) => l.entityType === confirmed[0].entityType && l.entityId === confirmed[0].entityId && l.fieldKey === confirmed[0].fieldKey)) {
      return { assetId: asset.assetId, outcome: "reconcile", reason: "Existing target reference confirmed; content remains unchanged.", score: 1, target: confirmed[0] };
    }
    if (active.length || references.length) return { assetId: asset.assetId, outcome: "review", reason: "Conflicting or incomplete existing association requires review.", score: 0 };
    if (/smoke|debug/i.test(asset.title)) return { assetId: asset.assetId, outcome: "review", reason: "Test-like asset; retained for operator review, not deleted.", score: 0 };
    const source = normalize(asset.title);
    const fieldKey = /coverart|cover/i.test(source) ? "coverArtUrl" : asset.assetType === "audio_preview" ? "audioPreviewUrl" : asset.assetType === "full_song" ? "fullSongUrl" : /^anmx.+00$/.test(source) ? "profileImage" : /^anmx.+\d+$/.test(source) ? "characterArtUrl" : undefined;
    const candidates = fieldKey ? available.filter((t) => t.entityType === (["profileImage", "characterArtUrl"].includes(fieldKey) ? "artist" : "release") && normalize(t.label).length >= 5 && source.includes(normalize(t.label))) : [];
    if (candidates.length !== 1 || !fieldKey) return { assetId: asset.assetId, outcome: "review", reason: candidates.length > 1 ? "Multiple matching records; manual selection required." : "No unique supported match.", score: 0 };
    const target = candidates[0];
    const occupied = Boolean(target.fields[fieldKey] || target.metadata?.[metadataKey(fieldKey)]) || links.some((l) => l.status === "active" && l.entityType === target.entityType && l.entityId === target.entityId && l.fieldKey === fieldKey);
    return { assetId: asset.assetId, outcome: "review", reason: occupied ? "Matching target already has this asset slot populated; replacement review required." : "Unique filename match above 60%; new association requires delivery validation and review.", score: 0.96, target: { entityType: target.entityType, entityId: target.entityId, fieldKey } };
  });
}
