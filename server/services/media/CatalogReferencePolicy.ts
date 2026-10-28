import { referencesAny } from "./TestMediaFixturePolicy";

export const catalogEntityId = (record: Record<string, unknown>, type: "artist" | "release") =>
  String(type === "artist" ? record.artistId ?? "" : record.releaseId ?? "");

export function hasLiveCatalogReference(record: Record<string, unknown>, ids: Set<string>): boolean {
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata) ? record.metadata as Record<string, unknown> : {};
  const { previousCoverArtAssetIds: _history, ...liveMetadata } = metadata;
  return referencesAny({ ...record, metadata: liveMetadata }, ids);
}
