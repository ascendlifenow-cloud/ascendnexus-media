import { useMemo, useState } from "react";
import type { MediaAssetRecord } from "../../models/admin";
import type { MediaAssetLinkEntityType, MediaAssetLinkFieldKey, MediaAssetLinkIntendedUse } from "../../models/media";
import { isAssetCompatibleWithField, type MediaAssetCompatibilityResult } from "../../utils/media/mediaAssetLinkUtils";

export const useMediaAssetLinkPicker = (
  entityType: MediaAssetLinkEntityType,
  fieldKey: MediaAssetLinkFieldKey,
  intendedUse: MediaAssetLinkIntendedUse,
) => {
  const [open, setOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<MediaAssetRecord | null>(null);
  const [query, setQuery] = useState("");

  const compatibility: MediaAssetCompatibilityResult | null = useMemo(
    () => selectedAsset ? isAssetCompatibleWithField(selectedAsset, entityType, fieldKey, intendedUse) : null,
    [entityType, fieldKey, intendedUse, selectedAsset],
  );

  return {
    open,
    setOpen,
    query,
    setQuery,
    selectedAsset,
    setSelectedAsset,
    compatibility,
    canConfirm: Boolean(selectedAsset && compatibility?.compatible),
    reset: () => {
      setSelectedAsset(null);
      setQuery("");
      setOpen(false);
    },
  };
};
