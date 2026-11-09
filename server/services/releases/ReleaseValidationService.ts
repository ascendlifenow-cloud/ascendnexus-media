import type { SongReleaseRecord } from "../../models/releases/SongReleaseModel";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseSlugService } from "./ReleaseSlugService";
import { jsonDatabase } from "../media/JsonDatabase";

export interface ReleaseValidationResult {
  valid: boolean;
  blockingIssues: string[];
  warnings: string[];
  missingFields: string[];
  fieldErrors: Record<string, string>;
  checkedAt: string;
}

export interface ReleaseValidationOptions {
  strictPublicMedia?: boolean;
}

const maxText = (value: string | undefined, limit: number): boolean => !value || value.length <= limit;
const isPublicSafeUrl = (value: string | undefined): boolean =>
  !value || value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public");
const isPrivateLeak = (value: unknown): boolean => typeof value === "string" && (value.includes("private/") || value.startsWith("blob:") || value.startsWith("data:"));
const isSafeExternalLink = (platform: string, url: string): boolean => {
  if (/^https:\/\//.test(url)) return true;
  return platform === "website" && url.startsWith("/") && !url.startsWith("//") && !url.includes("..");
};

export class ReleaseValidationService {
  async buildValidationResult(release: SongReleaseRecord, options: ReleaseValidationOptions = {}): Promise<ReleaseValidationResult> {
    const strictPublicMedia = options.strictPublicMedia ?? true;
    const blockingIssues: string[] = [];
    const warnings: string[] = [];
    const missingFields: string[] = [];
    const fieldErrors: Record<string, string> = {};

    if (!release.artistId?.trim()) missingFields.push("artistId");
    if (!release.title?.trim()) missingFields.push("title");
    if (!release.slug?.trim()) missingFields.push("slug");
    if (!release.releaseDate?.trim()) missingFields.push("releaseDate");

    const slugErrors = releaseSlugService.validateSlug(release.slug);
    if (slugErrors.length) fieldErrors.slug = slugErrors.join(" ");

    const dateValue = Date.parse(release.releaseDate);
    if (!Number.isFinite(dateValue)) fieldErrors.releaseDate = "Release date must be a valid ISO date.";
    if (!maxText(release.title, 300)) fieldErrors.title = "Release title must be 300 characters or fewer.";
    if (!maxText(release.description, 10000)) fieldErrors.description = "Release description must be 10,000 characters or fewer.";
    if (!maxText(release.lyrics, 100000)) fieldErrors.lyrics = "Lyrics must be 100,000 characters or fewer.";
    if (release.styleTags.length > 24) fieldErrors.styleTags = "Use 24 style tags or fewer.";
    if (release.genre && release.genre.length > 120) fieldErrors.genre = "Genre must be 120 characters or fewer.";

    Object.entries(release.externalLinks ?? {}).forEach(([platform, url]) => {
      if (!url) return;
      if (!isSafeExternalLink(platform, url)) fieldErrors[`externalLinks.${platform}`] = "External links must use HTTPS, except website may use a safe internal path.";
    });

    if (!isPublicSafeUrl(release.coverArtUrl)) {
      if (strictPublicMedia) fieldErrors.coverArtUrl = "Cover art URL must be public-safe.";
      else warnings.push("Cover art URL is not public-safe and must be replaced before publication.");
    }
    if (!isPublicSafeUrl(release.audioPreviewUrl)) {
      if (strictPublicMedia) fieldErrors.audioPreviewUrl = "Audio preview URL must be public-safe.";
      else warnings.push("Audio preview URL is not public-safe and must be replaced before publication.");
    }
    if (isPrivateLeak(release.coverArtUrl) || isPrivateLeak(release.audioPreviewUrl)) blockingIssues.push("Public release media cannot expose private, blob, or data URLs.");
    if (isPrivateLeak(release.metadata?.fullSongUrl) || isPrivateLeak(release.metadata?.fullSongPublicUrl)) {
      blockingIssues.push("Full-song master cannot be stored in a public release URL field.");
    }
    const fullSongIssues = await this.fullSongStorageIssues(release);
    (strictPublicMedia ? blockingIssues : warnings).push(...fullSongIssues);

    if (release.artistId) {
      const artist = await artistRepository.findById(release.artistId);
      if (!artist) {
        blockingIssues.push("Assigned artist was not found.");
      } else if (artist.status === "deleted" || artist.status === "archived") {
        blockingIssues.push("Assigned artist is archived or deleted.");
      } else if (release.status === "published" || release.publicationState === "published") {
        if (artist.status !== "active" || artist.publicationState !== "published" || !artist.publicVisibility) {
          blockingIssues.push("Assigned artist must be active, published, and public before release publication.");
        }
      }
    }

    if (!release.coverArtUrl) warnings.push("Cover art is missing; public pages will use a fallback until artwork is linked and published.");
    if (!release.audioPreviewUrl) warnings.push("Audio preview is missing; public pages will show preview unavailable.");
    if (!release.metadata?.fullSongAssetId) warnings.push("Private full-song master is not linked yet.");

    return {
      valid: blockingIssues.length === 0 && missingFields.length === 0 && Object.keys(fieldErrors).length === 0,
      blockingIssues,
      warnings,
      missingFields,
      fieldErrors,
      checkedAt: new Date().toISOString(),
    };
  }

  private async fullSongStorageIssues(release: SongReleaseRecord): Promise<string[]> {
    const assetReference = release.metadata?.fullSongAssetId;
    const storageReference = release.metadata?.fullSongStorageObjectId;
    if (!assetReference && !storageReference) return [];
    const assetId = typeof assetReference === "string" ? assetReference.trim() : "";
    const storageId = typeof storageReference === "string" ? storageReference.trim() : "";
    if ((assetReference && !assetId) || (storageReference && !storageId)) return ["Full-song selection contains an invalid asset or storage reference."];
    const [objects, assets] = await Promise.all([
      jsonDatabase.listCollection("mediaStorageObjects"),
      jsonDatabase.listCollection("mediaAssets"),
    ]);
    const asset = assets.find((item) => item.assetId === assetId);
    const selected = storageId ? objects.find((item) => item.storageObjectId === storageId) : undefined;
    const issues: string[] = [];
    if (assetId && (!asset || ["archived", "deleted"].includes(asset.status))) issues.push("Selected full-song asset is missing or inactive.");
    if (assetId && selected && selected.assetId !== assetId && asset?.metadata?.storageObjectId !== storageId) issues.push("Selected full-song asset and storage object do not match.");

    const assetIds = new Set(assetId ? [assetId] : []);
    const storageIds = new Set(storageId ? [storageId] : []);
    const related = new Set<typeof objects[number]>();
    // Include aliases and promoted copies, but not separately generated previews.
    let changed = true;
    while (changed) {
      const before = assetIds.size + storageIds.size + related.size;
      for (const item of assets) {
        const ids = [item.metadata?.storageObjectId, item.metadata?.sourceStorageObjectId, item.metadata?.publicStorageObjectId];
        if (assetIds.has(item.assetId) || ids.some((id) => typeof id === "string" && storageIds.has(id))) {
          assetIds.add(item.assetId);
          for (const id of ids) if (typeof id === "string") storageIds.add(id);
        }
      }
      for (const object of objects) {
        if (storageIds.has(object.storageObjectId) || (object.assetId && assetIds.has(object.assetId))
          || (typeof object.metadata?.sourceStorageObjectId === "string" && storageIds.has(object.metadata.sourceStorageObjectId))
          || [...related].some((other) => other.provider === object.provider && other.bucket === object.bucket && other.storagePath === object.storagePath)) {
          related.add(object);
          storageIds.add(object.storageObjectId);
          if (object.assetId) assetIds.add(object.assetId);
          if (typeof object.metadata?.sourceStorageObjectId === "string") storageIds.add(object.metadata.sourceStorageObjectId);
        }
      }
      changed = before !== assetIds.size + storageIds.size + related.size;
    }
    if ([...related].some((object) => object.accessLevel === "public" && !["archived", "deleted"].includes(object.status))) {
      issues.push("Selected full-song storage has an active public copy; publication requires private-only delivery.");
    }
    const candidates = storageId ? (selected ? [selected] : []) : objects.filter((object) => object.assetId === assetId || object.storageObjectId === asset?.metadata?.storageObjectId);
    if (!candidates.some((object) => object.status === "ready" && ["private", "admin_only", "signed"].includes(object.accessLevel))) {
      issues.push("Selected full-song master requires a ready private storage object before publication.");
    }
    return issues;
  }
}

export const releaseValidationService = new ReleaseValidationService();
