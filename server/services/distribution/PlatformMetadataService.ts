import type { DistributionDestination } from "../../models/operations/OperationsModels";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { galleryRepository } from "../../repositories/GalleryRepository";

export class PlatformMetadataService {
  async buildMetadata(entityType: string, entityId: string, platform: DistributionDestination) {
    const entity = await this.loadEntity(entityType, entityId);
    const title = String(entity?.title ?? entity?.name ?? "Ascend Nexus Media");
    const descriptionSource = String(entity?.description ?? entity?.bio ?? "New media from Ascend Nexus Media.");
    const description = `${descriptionSource}`.slice(0, platform.includes("instagram") || platform.includes("tiktok") ? 2200 : 5000);
    const tags = Array.from(new Set([
      "AscendNexusMedia",
      "AIMusic",
      "DigitalArtist",
      ...String(entity?.genre ?? "").split(/\s+/).filter(Boolean),
      ...((Array.isArray(entity?.styleTags) ? entity?.styleTags : []) as string[]),
    ])).slice(0, 20);
    return {
      title: platform.includes("youtube") ? `${title} | Ascend Nexus Media` : title,
      description,
      hashtags: tags.map((tag) => `#${tag.replace(/[^a-zA-Z0-9]/g, "")}`).filter((tag) => tag.length > 1),
      keywords: tags,
      categories: [String(entity?.genre ?? "music")],
      callToAction: "Listen, explore, and follow Ascend Nexus Media.",
      releaseNotes: String(entity?.metadata?.releaseNotes ?? ""),
      platform,
    };
  }

  private async loadEntity(entityType: string, entityId: string): Promise<Record<string, unknown> | undefined> {
    if (entityType === "release" || entityType === "song" || entityType === "album") return (await releaseRepository.get(entityId)) as Record<string, unknown> | undefined;
    if (entityType === "artist") return (await artistRepository.get(entityId)) as Record<string, unknown> | undefined;
    if (entityType === "gallery_item" || entityType === "gallery_collection") return (await galleryRepository.get(entityId)) as Record<string, unknown> | undefined;
    return undefined;
  }
}

export const platformMetadataService = new PlatformMetadataService();
