import { releaseRepository } from "../../repositories/ReleaseRepository";
import { mediaLibraryService } from "../media/MediaLibraryService";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";

const getStorageObjectId = async (mediaAssetId: string): Promise<string | undefined> =>
  (await mediaStoragePersistenceService.list()).find((item) => item.assetId === mediaAssetId)?.storageObjectId;

export class ReleaseCoverArtAssignmentService {
  async assignCoverArt(releaseId: string, mediaAssetId: string, context: { actorId?: string; intakeId?: string }) {
    const release = await releaseRepository.get(releaseId);
    if (!release) throw new Error("Release was not found for intake assignment.");
    const storageObjectId = await getStorageObjectId(mediaAssetId);
    const linkResult = await mediaLibraryService.linkAsset(mediaAssetId, {
      entityType: "release",
      entityId: releaseId,
      fieldKey: "coverArtUrl",
      intendedUse: "cover_art",
      actorId: context.actorId,
      updateEntityField: true,
      metadata: { source: "watched_media_intake", intakeId: context.intakeId ?? null },
    });
    const refreshed = await releaseRepository.get(releaseId);
    await releaseRepository.update(releaseId, {
      metadata: {
        ...(refreshed?.metadata ?? release.metadata ?? {}),
        coverArtAssetId: mediaAssetId,
        coverArtStorageObjectId: storageObjectId,
        pendingReleaseCoverArtAssignment: false,
        updatedByMediaIntake: true,
      },
      updatedBy: context.actorId,
    });
    return linkResult;
  }
}

export const releaseCoverArtAssignmentService = new ReleaseCoverArtAssignmentService();
