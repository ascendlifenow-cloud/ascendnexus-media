import { useQuery } from "@tanstack/react-query";
import { adminPreviewService, type AdminPreviewData } from "../../services/admin";
import type { ApiResult } from "../../services/api/httpClient";
import type { AdminPreviewEntityType } from "../utils/adminPreviewUtils";

export const adminPreviewKeys = {
  all: ["admin-preview"] as const,
  artist: (artistId: string | undefined) => [...adminPreviewKeys.all, "artist", artistId ?? "missing"] as const,
  release: (releaseId: string | undefined) => [...adminPreviewKeys.all, "release", releaseId ?? "missing"] as const,
  gallery: (galleryItemId: string | undefined) => [...adminPreviewKeys.all, "gallery", galleryItemId ?? "missing"] as const,
  homepage: () => [...adminPreviewKeys.all, "homepage"] as const,
  metadata: (metadataRecordId: string | undefined) => [...adminPreviewKeys.all, "metadata", metadataRecordId ?? "missing"] as const,
};

export const useArtistPreview = (artistId: string | undefined) =>
  useQuery({
    queryKey: adminPreviewKeys.artist(artistId),
    queryFn: () => adminPreviewService.getArtistPreview(artistId ?? ""),
    enabled: Boolean(artistId),
  });

export const useReleasePreview = (releaseId: string | undefined) =>
  useQuery({
    queryKey: adminPreviewKeys.release(releaseId),
    queryFn: () => adminPreviewService.getReleasePreview(releaseId ?? ""),
    enabled: Boolean(releaseId),
  });

export const useGalleryPreview = (galleryItemId: string | undefined) =>
  useQuery({
    queryKey: adminPreviewKeys.gallery(galleryItemId),
    queryFn: () => adminPreviewService.getGalleryPreview(galleryItemId ?? ""),
    enabled: Boolean(galleryItemId),
  });

export const useHomepagePreview = () =>
  useQuery({
    queryKey: adminPreviewKeys.homepage(),
    queryFn: () => adminPreviewService.getHomepagePreview(),
  });

export const useMetadataPreview = (metadataRecordId: string | undefined) =>
  useQuery({
    queryKey: adminPreviewKeys.metadata(metadataRecordId),
    queryFn: () => adminPreviewService.getMetadataPreview(metadataRecordId ?? ""),
    enabled: Boolean(metadataRecordId),
  });

export const useAdminPreview = (entityType: AdminPreviewEntityType, entityId?: string) =>
  useQuery<ApiResult<AdminPreviewData>>({
    queryKey: [...adminPreviewKeys.all, entityType, entityId ?? "missing"] as const,
    queryFn: async (): Promise<ApiResult<AdminPreviewData>> => {
      if (entityType === "artist") return adminPreviewService.getArtistPreview(entityId ?? "");
      if (entityType === "release") return adminPreviewService.getReleasePreview(entityId ?? "");
      if (entityType === "gallery") return adminPreviewService.getGalleryPreview(entityId ?? "");
      if (entityType === "metadata") return adminPreviewService.getMetadataPreview(entityId ?? "");
      return adminPreviewService.getHomepagePreview();
    },
    enabled: entityType === "homepage" || Boolean(entityId),
  });
