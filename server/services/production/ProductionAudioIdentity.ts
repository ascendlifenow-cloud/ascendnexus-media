import { createHash } from "node:crypto";
import type { SongProductionPackage } from "./SongProductionContract";

export function productionAudioIdentity(bundle: SongProductionPackage, storageObjectId: string) {
  const audio = bundle.assets.filter((item) => item.role === "final_audio");
  if (audio.length !== 1) return null;
  return createHash("sha256").update(JSON.stringify([bundle.songId, bundle.revision, audio[0].assetId, audio[0].revision, audio[0].sha256, storageObjectId])).digest("hex");
}
