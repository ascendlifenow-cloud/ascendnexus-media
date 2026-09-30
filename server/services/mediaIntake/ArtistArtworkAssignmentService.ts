import { artistRepository } from "../../repositories/ArtistRepository";
import { mediaLibraryService } from "../media/MediaLibraryService";
import { mediaStoragePersistenceService } from "../media/MediaStoragePersistenceService";

const getStorageObjectId = async (mediaAssetId: string): Promise<string | undefined> =>
  (await mediaStoragePersistenceService.list()).find((item) => item.assetId === mediaAssetId)?.storageObjectId;

export class ArtistArtworkAssignmentService {
  async assignProfileImage(artistId: string, mediaAssetId: string, context: { actorId?: string; intakeId?: string }) {
    const artist = await artistRepository.get(artistId);
    if (!artist) throw new Error("Artist was not found for intake assignment.");
    const storageObjectId = await getStorageObjectId(mediaAssetId);
    const linkResult = await mediaLibraryService.linkAsset(mediaAssetId, {
      entityType: "artist",
      entityId: artistId,
      fieldKey: "profileImage",
      intendedUse: "artist_profile_image",
      actorId: context.actorId,
      updateEntityField: true,
      metadata: { source: "watched_media_intake", intakeId: context.intakeId ?? null },
    });
    const refreshed = await artistRepository.get(artistId);
    await artistRepository.update(artistId, {
      metadata: {
        ...(refreshed?.metadata ?? artist.metadata ?? {}),
        profileImageAssetId: mediaAssetId,
        profileImageStorageObjectId: storageObjectId,
        pendingArtistArtworkAssignment: false,
        updatedByMediaIntake: true,
      },
      updatedBy: context.actorId,
    });
    return linkResult;
  }

  async assignCharacterArt(artistId: string, mediaAssetId: string, sequence: number, context: { actorId?: string; intakeId?: string }) {
    const artist = await artistRepository.get(artistId);
    if (!artist) throw new Error("Artist was not found for intake assignment.");
    const storageObjectId = await getStorageObjectId(mediaAssetId);
    const existing = Array.isArray(artist.metadata?.characterArtAssets) ? artist.metadata.characterArtAssets as Array<Record<string, unknown>> : [];
    const next = [
      ...existing.filter((item) => item.sequence !== sequence),
      { mediaAssetId, storageObjectId, sequence, source: "watched_media_intake", intakeId: context.intakeId ?? null },
    ].sort((a, b) => Number(a.sequence ?? 0) - Number(b.sequence ?? 0));
    const linkResult = await mediaLibraryService.linkAsset(mediaAssetId, {
      entityType: "artist",
      entityId: artistId,
      fieldKey: "characterArtUrl",
      intendedUse: "artist_character_art",
      actorId: context.actorId,
      updateEntityField: true,
      metadata: { source: "watched_media_intake", intakeId: context.intakeId ?? null, sequence },
    });
    const refreshed = await artistRepository.get(artistId);
    const mergedExisting = Array.isArray(refreshed?.metadata?.characterArtAssets) ? refreshed?.metadata?.characterArtAssets as Array<Record<string, unknown>> : next;
    await artistRepository.update(artistId, {
      metadata: {
        ...(refreshed?.metadata ?? artist.metadata ?? {}),
        characterArtAssets: mergedExisting,
        pendingArtistArtworkAssignment: false,
        updatedByMediaIntake: true,
      },
      updatedBy: context.actorId,
    });
    return linkResult;
  }
}

export const artistArtworkAssignmentService = new ArtistArtworkAssignmentService();
