import type { MediaStorageObject } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class MediaStorageObjectRepository extends BaseRepository<MediaStorageObject & Record<string, unknown>> { constructor() { super("mediaStorageObjects", "storageObjectId"); } }
export const mediaStorageObjectRepository = new MediaStorageObjectRepository();
