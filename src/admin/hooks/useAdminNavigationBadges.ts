import { useEffect, useState } from "react";
import { mediaAssignmentReviewService } from "../../services/media/MediaAssignmentReviewService";
import { mediaAssignmentChangedEventName, mediaReviewCountChangedEventName } from "../../services/media/MediaAssignmentEvents";

export interface AdminNavigationBadges {
  media_review?: number;
}

export function useAdminNavigationBadges() {
  const [badges, setBadges] = useState<AdminNavigationBadges>({});

  useEffect(() => {
    let active = true;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing || !active) return;
      refreshing = true;
      try {
        // The service publishes the unfiltered queue count after rebuilding it.
        await mediaAssignmentReviewService.listReviewItems();
      } catch { /* Keep the last known count during a connection failure. */ }
      finally { refreshing = false; }
    };
    const handleCountChanged = (event: Event) => {
      const count = event instanceof CustomEvent ? event.detail?.count : undefined;
      if (active && Number.isInteger(count) && count >= 0) setBadges({ media_review: count });
    };
    const handleAssetRemoved = (event: Event) => {
      const assetId = event instanceof CustomEvent ? event.detail?.assetId : undefined;
      if (typeof assetId !== "string") return;
      if (event.type === mediaAssignmentChangedEventName) mediaAssignmentReviewService.resolveAssignedAsset(assetId);
      else mediaAssignmentReviewService.removeAssetFromReviewQueue(assetId);
    };
    window.addEventListener(mediaReviewCountChangedEventName, handleCountChanged);
    window.addEventListener(mediaAssignmentChangedEventName, handleAssetRemoved);
    window.addEventListener("anm:media-asset-hard-deleted", handleAssetRemoved);
    window.addEventListener("focus", refresh);
    void refresh();
    return () => {
      active = false;
      window.removeEventListener(mediaReviewCountChangedEventName, handleCountChanged);
      window.removeEventListener(mediaAssignmentChangedEventName, handleAssetRemoved);
      window.removeEventListener("anm:media-asset-hard-deleted", handleAssetRemoved);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return badges;
}
