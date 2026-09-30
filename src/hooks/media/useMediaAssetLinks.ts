import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  MediaAssetAssignmentStatus,
  MediaAssetLink,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkOptions,
} from "../../models/media";
import { mediaAssetLinkingService } from "../../services/media";
import { adminArtistsKeys, adminGalleryKeys, adminMediaKeys, adminMetadataKeys, adminReleasesKeys, adminSiteConfigKeys } from "../../utils/admin";

export interface UseMediaAssetLinksOptions {
  assetId?: string;
  entityType?: MediaAssetLinkEntityType;
  entityId?: string;
}

export const useMediaAssetLinks = ({ assetId, entityType, entityId }: UseMediaAssetLinksOptions = {}) => {
  const queryClient = useQueryClient();
  const [links, setLinks] = useState<MediaAssetLink[]>([]);
  const [assignmentStatus, setAssignmentStatus] = useState<MediaAssetAssignmentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (assetId) {
        setLinks(mediaAssetLinkingService.getAssetLinks(assetId));
        setAssignmentStatus(await mediaAssetLinkingService.getAssignmentStatus(assetId));
      } else if (entityType && entityId) {
        setLinks(mediaAssetLinkingService.getEntityMediaLinks(entityType, entityId));
        setAssignmentStatus(null);
      } else {
        setLinks([]);
        setAssignmentStatus(null);
      }
      setError(null);
    } catch {
      setError("Media asset links are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [assetId, entityId, entityType]);

  const invalidateAssignmentCaches = useCallback((nextAssetId: string, nextEntityType: MediaAssetLinkEntityType, nextEntityId: string) => {
    void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
    void queryClient.invalidateQueries({ queryKey: adminMediaKeys.detail(nextAssetId) });
    if (nextEntityType === "artist") {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(nextEntityId) });
    }
    if (nextEntityType === "release") {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(nextEntityId) });
    }
    if (nextEntityType === "gallery_item") {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(nextEntityId) });
    }
    if (nextEntityType === "site_config" || nextEntityType === "homepage_section") {
      void queryClient.invalidateQueries({ queryKey: adminSiteConfigKeys.all });
    }
    if (nextEntityType === "seo_metadata" || nextEntityType === "social_metadata") {
      void queryClient.invalidateQueries({ queryKey: adminMetadataKeys.all });
    }
  }, [queryClient]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const linkAsset = useCallback(async (
    nextAssetId: string,
    nextEntityType: MediaAssetLinkEntityType,
    nextEntityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    options: MediaAssetLinkOptions,
  ) => {
    const result = await mediaAssetLinkingService.linkAssetToEntity(nextAssetId, nextEntityType, nextEntityId, fieldKey, options);
    if (!result.ok) setError(result.error.message);
    else invalidateAssignmentCaches(nextAssetId, nextEntityType, nextEntityId);
    await refresh();
    return result;
  }, [invalidateAssignmentCaches, refresh]);

  const replaceAsset = useCallback(async (
    nextAssetId: string,
    nextEntityType: MediaAssetLinkEntityType,
    nextEntityId: string,
    fieldKey: MediaAssetLinkFieldKey,
    options: MediaAssetLinkOptions,
  ) => {
    const result = await mediaAssetLinkingService.replaceEntityAsset(nextAssetId, nextEntityType, nextEntityId, fieldKey, options);
    if (!result.ok) setError(result.error.message);
    else invalidateAssignmentCaches(nextAssetId, nextEntityType, nextEntityId);
    await refresh();
    return result;
  }, [invalidateAssignmentCaches, refresh]);

  const detachAsset = useCallback(async (linkId: string) => {
    const result = await mediaAssetLinkingService.detachAssetFromEntity(linkId);
    if (!result.ok) setError(result.error.message);
    await refresh();
    return result;
  }, [refresh]);

  return {
    links,
    assignmentStatus,
    loading,
    error,
    refresh,
    linkAsset,
    replaceAsset,
    detachAsset,
  };
};
