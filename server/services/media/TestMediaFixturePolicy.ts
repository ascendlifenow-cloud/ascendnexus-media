// Deliberately recognize known development fixtures, not songs containing "test" or "smoke".
export function isKnownTestMediaFixture(asset: { title?: string; assetId?: string }): boolean {
  const title = asset.title ?? "";
  return (title === "Private Full Song" && /^publication-full-song-\d{13}-[a-z0-9]+$/.test(asset.assetId ?? ""))
    || (title === "Seed Public Preview" && asset.assetId === "seed-asset-public-preview")
    || (title === "Seed Protected Full Stream" && asset.assetId === "seed-asset-premium-full-stream")
    || /^(?:Backend Smoke Cover|Publication Smoke Cover|Processing Smoke|Real Processing Smoke|Release Cover Picker Smoke)$/.test(title)
    || /^Smoke (?:Cover|Full Song) \d{13}-[a-z0-9]+$/.test(title)
    || /^Debug(?:CoverArt|CoverArtLan|CoverArtLanRestarted|LargeCoverArt|CustomImageCoverArt|CustomImageAfterProxyFix|OriginCoverArt|MalformedMetadataCoverArt)$/.test(title);
}

export function referencesAny(value: unknown, identifiers: Set<string>): boolean {
  if (typeof value === "string") return identifiers.has(value);
  if (Array.isArray(value)) return value.some((item) => referencesAny(item, identifiers));
  if (value && typeof value === "object") return Object.values(value).some((item) => referencesAny(item, identifiers));
  return false;
}
