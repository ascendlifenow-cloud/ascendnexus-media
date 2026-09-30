import type { DistributionDestination, MediaTransformationRecord } from "../../models/operations/OperationsModels";
import { mediaTransformationRepository } from "../../repositories/operations/OperationsRepository";
import { id, nowIso } from "./distributionShared";

const imageTransforms: MediaTransformationRecord["transformationType"][] = ["thumbnail", "square_artwork", "portrait_artwork", "landscape_artwork", "banner", "social_graphic"];
const videoTransforms: MediaTransformationRecord["transformationType"][] = ["video_thumbnail", "preview_clip", "short_clip", "trailer_video"];
const audioTransforms: MediaTransformationRecord["transformationType"][] = ["preview_audio", "waveform_video", "platform_export"];

export class MediaTransformationService {
  async planTransformations(distributionJobId: string, assetId: string | undefined, destinations: DistributionDestination[]) {
    const created: MediaTransformationRecord[] = [];
    for (const destination of destinations) {
      const transforms = this.transformsFor(destination);
      for (const transformationType of transforms) {
        created.push(await mediaTransformationRepository.create({
          transformationId: id("transform"),
          distributionJobId,
          assetId,
          transformationType,
          targetPlatform: destination,
          status: assetId ? "queued" : "skipped",
          sourceAssetId: assetId,
          warnings: assetId ? [] : ["No source asset was provided; transformation is skipped."],
          errors: [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
          metadata: { plannedOnly: true },
          schemaVersion: 1,
        }));
      }
    }
    return created;
  }

  async completePlanningOnly(distributionJobId: string) {
    const transforms = (await mediaTransformationRepository.list({ includeArchived: true })).filter((item) => item.distributionJobId === distributionJobId);
    const updated = [];
    for (const transform of transforms.filter((item) => item.status === "queued")) {
      const next = await mediaTransformationRepository.update(transform.transformationId, {
        status: "completed",
        updatedAt: nowIso(),
        warnings: [...transform.warnings, "Variant plan recorded; real derivative generation remains delegated to the media processing worker."],
      });
      if (next) updated.push(next);
    }
    return updated;
  }

  private transformsFor(destination: DistributionDestination): MediaTransformationRecord["transformationType"][] {
    if (destination.includes("youtube") || destination.includes("tiktok") || destination.includes("reels")) return [...videoTransforms, "thumbnail", "social_graphic"];
    if (["spotify", "apple_music", "amazon_music", "soundcloud", "bandcamp"].includes(destination)) return [...audioTransforms, "square_artwork"];
    if (["instagram", "facebook", "threads", "x", "pinterest", "mastodon"].includes(destination)) return imageTransforms;
    return ["thumbnail", "social_graphic", "platform_export"];
  }
}

export const mediaTransformationService = new MediaTransformationService();
