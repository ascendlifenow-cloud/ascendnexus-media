import type { MediaAsset } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class MediaAssetRepository extends BaseRepository<MediaAsset & Record<string, unknown>> { constructor() { super("mediaAssets", "assetId"); } }
export const mediaAssetRepository = new MediaAssetRepository();
