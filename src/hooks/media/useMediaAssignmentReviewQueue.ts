import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { MediaAssignmentReviewItem, MediaAssetLinkEntityType } from "../../models/media";
import { mediaAssignmentChangedEventName } from "../../services/media/MediaAssignmentEvents";
import { mediaAssignmentReviewService, type MediaReviewAssignmentInput } from "../../services/media/MediaAssignmentReviewService";
import { adminArtistsKeys, adminGalleryKeys, adminMediaKeys, adminMetadataKeys, adminReleasesKeys, adminSiteConfigKeys } from "../../utils/admin";
import { getMediaReviewQueueStats, type MediaReviewFilters } from "../../utils/media/mediaAssignmentReviewUtils";

const defaultMediaReviewFilters: MediaReviewFilters = {};

export function useMediaAssignmentReviewQueue(filters: MediaReviewFilters = defaultMediaReviewFilters) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<MediaAssignmentReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoaded = useRef(false);

  const refreshQueue = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true);
    setError(null);
    const result = await mediaAssignmentReviewService.listReviewItems(filters);
    if (result.ok) {
      setItems(result.data);
    } else {
      setError(result.error.message);
    }
    hasLoaded.current = true;
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleAssetHardDeleted = (event: Event) => {
      const assetId = event instanceof CustomEvent && typeof event.detail?.assetId === "string" ? event.detail.assetId : undefined;
      if (!assetId) return;
      mediaAssignmentReviewService.removeAssetFromReviewQueue(assetId);
      setItems((current) => current.filter((item) => item.assetId !== assetId));
      void refreshQueue();
    };
    window.addEventListener("anm:media-asset-hard-deleted", handleAssetHardDeleted);
    return () => window.removeEventListener("anm:media-asset-hard-deleted", handleAssetHardDeleted);
  }, [refreshQueue]);

  const invalidateAssignmentCaches = useCallback((assetId: string, entityType?: MediaAssetLinkEntityType, entityId?: string) => {
    void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
    void queryClient.invalidateQueries({ queryKey: adminMediaKeys.detail(assetId) });
    if (entityType === "artist" && entityId) {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(entityId) });
    }
    if (entityType === "release" && entityId) {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(entityId) });
    }
    if (entityType === "gallery_item" && entityId) {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(entityId) });
    }
    if (entityType === "site_config" || entityType === "homepage_section") {
      void queryClient.invalidateQueries({ queryKey: adminSiteConfigKeys.all });
    }
    if (entityType === "seo_metadata" || entityType === "social_metadata") {
      void queryClient.invalidateQueries({ queryKey: adminMetadataKeys.all });
    }
  }, [queryClient]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleAssignmentChanged = (event: Event) => {
      const assetId = event instanceof CustomEvent && typeof event.detail?.assetId === "string" ? event.detail.assetId : undefined;
      if (!assetId) return;
      const entityType = event instanceof CustomEvent && typeof event.detail?.entityType === "string" ? event.detail.entityType as MediaAssetLinkEntityType : undefined;
      const entityId = event instanceof CustomEvent && typeof event.detail?.entityId === "string" ? event.detail.entityId : undefined;
      mediaAssignmentReviewService.removeAssetFromReviewQueue(assetId);
      setItems((current) => current.filter((item) => item.assetId !== assetId));
      invalidateAssignmentCaches(assetId, entityType, entityId);
      void refreshQueue();
    };
    window.addEventListener(mediaAssignmentChangedEventName, handleAssignmentChanged);
    return () => window.removeEventListener(mediaAssignmentChangedEventName, handleAssignmentChanged);
  }, [invalidateAssignmentCaches, refreshQueue]);

  const markInReview = useCallback(async (reviewItemId: string) => {
    const result = await mediaAssignmentReviewService.markInReview(reviewItemId);
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const assignItem = useCallback(async (reviewItemId: string, assignment: MediaReviewAssignmentInput) => {
    const result = await mediaAssignmentReviewService.assignAssetFromReview(reviewItemId, assignment);
    if (result.ok) invalidateAssignmentCaches(result.data.assetId, assignment.entityType, assignment.entityId);
    await refreshQueue();
    return result;
  }, [invalidateAssignmentCaches, refreshQueue]);

  const keepUnassigned = useCallback(async (reviewItemId: string) => {
    const result = await mediaAssignmentReviewService.markKeptUnassigned(reviewItemId);
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const archiveItem = useCallback(async (reviewItemId: string) => {
    const result = await mediaAssignmentReviewService.archiveReviewItem(reviewItemId);
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const deleteItem = useCallback(async (reviewItemId: string) => {
    const result = await mediaAssignmentReviewService.deleteReviewItem(reviewItemId);
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const bulkKeepUnassigned = useCallback(async (reviewItemIds: string[]) => {
    const result = await mediaAssignmentReviewService.bulkMarkKeptUnassigned(reviewItemIds);
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const bulkArchive = useCallback(async (reviewItemIds: string[]) => {
    const result = await mediaAssignmentReviewService.bulkArchiveReviewItems(reviewItemIds);
    await refreshQueue();
    return result;
  }, [refreshQueue]);

  const stats = useMemo(() => getMediaReviewQueueStats(items), [items]);

  return {
    items,
    stats,
    loading,
    error,
    refreshQueue,
    markInReview,
    assignItem,
    keepUnassigned,
    archiveItem,
    deleteItem,
    bulkKeepUnassigned,
    bulkArchive,
  };
}
