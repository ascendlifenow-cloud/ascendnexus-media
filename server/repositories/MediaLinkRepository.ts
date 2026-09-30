import type { MediaAssetLink } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class MediaLinkRepository extends BaseRepository<MediaAssetLink & Record<string, unknown>> {
  constructor() { super("mediaAssetLinks", "linkId"); }
  async listByAsset(assetId: string) { return (await this.list({ includeArchived: true })).filter((link) => link.assetId === assetId); }
  async listByEntity(entityType: string, entityId: string) { return (await this.list({ includeArchived: true })).filter((link) => link.entityType === entityType && link.entityId === entityId); }
  async findActiveEntityField(entityType: string, entityId: string, fieldKey: string) {
    return (await this.list()).find((link) => link.entityType === entityType && link.entityId === entityId && link.fieldKey === fieldKey && link.status === "active") ?? null;
  }
}
export const mediaLinkRepository = new MediaLinkRepository();
