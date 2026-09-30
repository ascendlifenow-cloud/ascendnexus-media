import { useState } from "react";
import type { MediaAssetRecord } from "../../models/admin";

export function useSelectedMediaAsset() {
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetRecord | null>(null);

  return {
    selectedAsset,
    selectAsset: setSelectedAsset,
    clearSelectedAsset: () => setSelectedAsset(null),
  };
}
