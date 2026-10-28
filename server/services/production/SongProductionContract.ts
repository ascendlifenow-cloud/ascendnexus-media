import { createHash } from "node:crypto";

export interface ProductionAssetRevision {
  assetId: string;
  revision: string;
  sha256: string;
  role: "artwork" | "final_audio" | "production_document";
}

export interface SongProductionPackage {
  songId: string;
  revision: number;
  title: string;
  artistId: string;
  artistProfileVersion: string;
  brief: string;
  creativeIntent: string;
  masterPrompt: string;
  lyrics: string;
  styles: [string, string];
  references: { source: string; version: string; approval: "approved" | "unreviewed" }[];
  assets: ProductionAssetRevision[];
  catalogMetadata: Record<string, string>;
  destinations: { platform: string; copy: string; assetIds: string[] }[];
  websiteVisibility: "private" | "public" | "member";
  scheduledFor?: string;
}

// Count Unicode code points in the exact saved text, without trimming or normalization.
export const countProductionCharacters = (text: string) => Array.from(text).length;

const canonical = (value: unknown): string => {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const productionValueHash = (value: unknown) => createHash("sha256").update(canonical(value), "utf8").digest("hex");
export const productionBundleHash = (bundle: SongProductionPackage) => productionValueHash(bundle);

export function validateSongProductionPackage(bundle: SongProductionPackage) {
  const errors: string[] = [];
  for (const key of ["songId", "title", "artistId", "artistProfileVersion", "brief", "creativeIntent", "masterPrompt", "lyrics"] as const) {
    if (typeof bundle[key] !== "string" || !bundle[key].trim()) errors.push(`${key} is required.`);
  }
  if (!Number.isSafeInteger(bundle.revision) || bundle.revision < 1) errors.push("revision must be a positive integer.");
  const lyrics = typeof bundle.lyrics === "string" ? countProductionCharacters(bundle.lyrics) : 0;
  if (lyrics < 4500 || lyrics > 5000) errors.push("Lyrics must contain 4500–5000 characters including whitespace and directions.");
  const styles = Array.isArray(bundle.styles) ? bundle.styles.map((style) => typeof style === "string" ? countProductionCharacters(style) : 0) : [];
  if (styles.length !== 2 || styles.some((count) => count === 0 || count >= 1000)) errors.push("Exactly two nonempty styles, each below 1000 characters, are required.");
  if (!["private", "public", "member"].includes(bundle.websiteVisibility)) errors.push("Invalid website visibility.");
  if (bundle.scheduledFor && !Number.isFinite(Date.parse(bundle.scheduledFor))) errors.push("Invalid schedule.");
  const assets = Array.isArray(bundle.assets) ? bundle.assets : [];
  const ids = new Set<string>();
  for (const asset of assets) {
    if (!asset.assetId || !asset.revision || !/^[a-f0-9]{64}$/.test(asset.sha256)) errors.push("Each asset requires an ID, revision, and SHA-256 checksum.");
    if (ids.has(asset.assetId)) errors.push("Duplicate asset ID.");
    ids.add(asset.assetId);
  }
  if (!assets.some((asset) => asset.role === "artwork")) errors.push("Artwork artifact is required.");
  if (!Array.isArray(bundle.references) || !bundle.references.length) errors.push("Reference provenance is required.");
  for (const reference of bundle.references ?? []) {
    if (!reference.source || !reference.version || reference.approval !== "approved") errors.push("Release references require approved, versioned provenance.");
  }
  for (const destination of bundle.destinations ?? []) {
    if (!destination.platform || !destination.copy || destination.assetIds.some((id) => !ids.has(id))) errors.push("Destination copy and associated assets must be valid.");
  }
  return { valid: errors.length === 0, errors, counts: { lyrics, styles }, countingConvention: "Unicode code points; exact saved text; whitespace, CR/LF, and bracketed directions included", bundleHash: productionBundleHash(bundle) };
}

export interface ProductionApproval {
  bundleHash: string;
  approvedBy: string;
  approvedAt: string;
  revokedAt?: string;
}

export function assertProductionApproval(bundle: SongProductionPackage, approval: ProductionApproval | undefined) {
  const report = validateSongProductionPackage(bundle);
  if (!report.valid || !bundle.assets.some((asset) => asset.role === "final_audio")) throw new Error("PRODUCTION_BUNDLE_INCOMPLETE");
  if (!approval?.approvedBy || !Number.isFinite(Date.parse(approval.approvedAt)) || approval.revokedAt || approval.bundleHash !== report.bundleHash) throw new Error("PRODUCTION_APPROVAL_REQUIRED");
}
