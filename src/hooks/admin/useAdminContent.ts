import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  SeedBackedAdminArtistService,
  SeedBackedAdminMetadataService,
  SeedBackedAdminReleaseService,
  adminMediaService,
  adminArtistService,
  adminReleaseService,
  adminGalleryService,
  adminSiteConfigService,
  type AdminGalleryFilters,
  type AdminMediaFilters,
  type AdminMetadataFilters,
  type AdminReleaseFilters,
} from "../../services/admin";
import type {
  CreateArtistDto,
  CreateGalleryItemDto,
  CreateMediaAssetDto,
  CreateReleaseDto,
  MediaAssetRecord,
  UpdateArtistDto,
  UpdateGalleryItemDto,
  UpdateMediaAssetDto,
  UpdateReleaseDto,
  UpdateSiteConfigDto,
} from "../../models/admin";
import {
  adminArtistsKeys,
  adminGalleryKeys,
  adminMediaKeys,
  adminMetadataKeys,
  adminReleasesKeys,
  adminSiteConfigKeys,
} from "../../utils/admin";
import type { AdminMetadataEntityType } from "../../models/admin";
import type { SeoMetadata } from "../../models/seo";
import type { SocialShareMetadata } from "../../models/social";
import { adminSeoApiService } from "../../admin/services/AdminSeoApiService";

const artistService = adminArtistService;
const releaseService = adminReleaseService;
const mediaService = adminMediaService;
const galleryService = adminGalleryService;
const metadataService = new SeedBackedAdminMetadataService();
const siteConfigService = adminSiteConfigService;

export const useAdminArtists = () =>
  useQuery({
    queryKey: adminArtistsKeys.lists(),
    queryFn: () => artistService.listArtists(),
  });

export const useAdminArtist = (artistId: string | undefined) =>
  useQuery({
    queryKey: artistId ? adminArtistsKeys.detail(artistId) : [...adminArtistsKeys.all, "missing"] as const,
    queryFn: () => artistService.getArtist(artistId ?? ""),
    enabled: Boolean(artistId),
  });

export const useCreateAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateArtistDto) => artistService.createArtist(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
    },
  });
};

export const useUpdateAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artistId, payload }: { artistId: string; payload: UpdateArtistDto }) =>
      artistService.updateArtist(artistId, payload),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(variables.artistId) });
    },
  });
};

export const usePublishAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artistId: string) => artistService.publishArtist(artistId),
    onSuccess: (_result, artistId) => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(artistId) });
    },
  });
};

export const useUnpublishAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artistId: string) => artistService.unpublishArtist(artistId),
    onSuccess: (_result, artistId) => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(artistId) });
    },
  });
};

export const useArchiveAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artistId: string) => artistService.archiveArtist(artistId),
    onSuccess: (_result, artistId) => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(artistId) });
    },
  });
};

export const useRestoreAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artistId: string) => artistService.restoreArtist(artistId),
    onSuccess: (_result, artistId) => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(artistId) });
    },
  });
};

export const useDeleteAdminArtist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (artistId: string) => artistService.deleteArtist(artistId),
    onSuccess: (_result, artistId) => {
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.detail(artistId) });
    },
  });
};

export const useAdminReleases = (filters: AdminReleaseFilters = {}) =>
  useQuery({
    queryKey: [...adminReleasesKeys.lists(), filters] as const,
    queryFn: () => releaseService.listReleases(filters),
  });

export const useAdminRelease = (releaseId: string | undefined) =>
  useQuery({
    queryKey: releaseId ? adminReleasesKeys.detail(releaseId) : [...adminReleasesKeys.all, "missing"] as const,
    queryFn: () => releaseService.getRelease(releaseId ?? ""),
    enabled: Boolean(releaseId),
  });

export const useCreateAdminRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateReleaseDto) => releaseService.createRelease(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
    },
  });
};

export const useUpdateAdminRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ releaseId, payload }: { releaseId: string; payload: UpdateReleaseDto }) =>
      releaseService.updateRelease(releaseId, payload),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(variables.releaseId) });
    },
  });
};

export const usePublishAdminRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (releaseId: string) => releaseService.publishRelease(releaseId),
    onSuccess: (_result, releaseId) => {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(releaseId) });
    },
  });
};

export const useArchiveAdminRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (releaseId: string) => releaseService.archiveRelease(releaseId),
    onSuccess: (_result, releaseId) => {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(releaseId) });
    },
  });
};

export const useUnpublishAdminRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (releaseId: string) => releaseService.unpublishRelease(releaseId),
    onSuccess: (_result, releaseId) => {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(releaseId) });
    },
  });
};

export const useRestoreAdminRelease = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (releaseId: string) => releaseService.restoreRelease(releaseId),
    onSuccess: (_result, releaseId) => {
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.detail(releaseId) });
    },
  });
};

export const useAdminMediaAssets = (filters: AdminMediaFilters = {}) =>
  useQuery({
    queryKey: [...adminMediaKeys.lists(), filters] as const,
    queryFn: () => mediaService.listMediaAssets(filters),
  });

export const useAdminMediaAsset = (assetId: string | undefined) =>
  useQuery({
    queryKey: assetId ? adminMediaKeys.detail(assetId) : [...adminMediaKeys.all, "missing"] as const,
    queryFn: () => mediaService.getMediaAsset(assetId ?? ""),
    enabled: Boolean(assetId),
  });

export const useCreateAdminMediaAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMediaAssetDto) => mediaService.createMediaAsset(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
    },
  });
};

export const useUpdateAdminMediaAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assetId, payload }: { assetId: string; payload: UpdateMediaAssetDto }) =>
      mediaService.updateMediaAsset(assetId, payload),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.detail(variables.assetId) });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
    },
  });
};

export const useArchiveAdminMediaAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => mediaService.archiveMediaAsset(assetId),
    onSuccess: (_result, assetId) => {
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.detail(assetId) });
    },
  });
};

export const useDeleteAdminMediaAsset = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => mediaService.deleteMediaAsset(assetId),
    onSuccess: (result, assetId) => {
      if (result.ok) {
        queryClient.setQueriesData({ queryKey: adminMediaKeys.lists() }, (current: unknown) => {
          if (
            current &&
            typeof current === "object" &&
            "ok" in current &&
            current.ok === true &&
            "data" in current &&
            Array.isArray(current.data)
          ) {
            return { ...current, data: current.data.filter((asset: MediaAssetRecord) => asset.assetId !== assetId) };
          }
          return current;
        });
      }
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminMediaKeys.detail(assetId) });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminReleasesKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminArtistsKeys.all });
    },
  });
};

export const useAdminGalleryItems = (filters: AdminGalleryFilters = {}) =>
  useQuery({
    queryKey: [...adminGalleryKeys.lists(), filters] as const,
    queryFn: () => galleryService.listGalleryItems(filters),
  });

export const useAdminGalleryItem = (galleryItemId: string | undefined) =>
  useQuery({
    queryKey: galleryItemId ? adminGalleryKeys.detail(galleryItemId) : [...adminGalleryKeys.all, "missing"] as const,
    queryFn: () => galleryService.getGalleryItem(galleryItemId ?? ""),
    enabled: Boolean(galleryItemId),
  });

export const useCreateAdminGalleryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGalleryItemDto) => galleryService.createGalleryItem(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
    },
  });
};

export const useUpdateAdminGalleryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ galleryItemId, payload }: { galleryItemId: string; payload: UpdateGalleryItemDto }) =>
      galleryService.updateGalleryItem(galleryItemId, payload),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(variables.galleryItemId) });
    },
  });
};

export const useArchiveAdminGalleryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryItemId: string) => galleryService.archiveGalleryItem(galleryItemId),
    onSuccess: (_result, galleryItemId) => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(galleryItemId) });
    },
  });
};

export const usePublishAdminGalleryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryItemId: string) => galleryService.publishGalleryItem(galleryItemId),
    onSuccess: (_result, galleryItemId) => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(galleryItemId) });
    },
  });
};

export const useUnpublishAdminGalleryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryItemId: string) => galleryService.unpublishGalleryItem(galleryItemId),
    onSuccess: (_result, galleryItemId) => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(galleryItemId) });
    },
  });
};

export const useRestoreAdminGalleryItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (galleryItemId: string) => galleryService.restoreGalleryItem(galleryItemId),
    onSuccess: (_result, galleryItemId) => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.detail(galleryItemId) });
    },
  });
};

export const useReorderAdminGalleryItems = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: Array<{ galleryItemId: string; sortOrder: number }>) => galleryService.reorderGalleryItems(items),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminGalleryKeys.all });
    },
  });
};

export const useAdminMetadataRecords = (filters: AdminMetadataFilters = {}) =>
  useQuery({
    queryKey: [...adminMetadataKeys.lists(), filters] as const,
    queryFn: () => metadataService.listMetadataRecords(filters),
  });

export const useAdminSeoHealth = () =>
  useQuery({
    queryKey: ["admin", "seo", "health"] as const,
    queryFn: () => adminSeoApiService.getHealth(),
  });

export const useAdminMetadataRecord = (metadataRecordId: string | undefined) =>
  useQuery({
    queryKey: metadataRecordId ? adminMetadataKeys.detail(metadataRecordId) : [...adminMetadataKeys.all, "missing"] as const,
    queryFn: () => metadataService.getMetadataRecord(metadataRecordId ?? ""),
    enabled: Boolean(metadataRecordId),
  });

export const useUpdateAdminSeoMetadata = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, payload }: { entityType: AdminMetadataEntityType; entityId: string; payload: SeoMetadata }) =>
      metadataService.updateSeoMetadata(entityType, entityId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminMetadataKeys.all });
    },
  });
};

export const useUpdateAdminSocialMetadata = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, payload }: { entityType: AdminMetadataEntityType; entityId: string; payload: SocialShareMetadata }) =>
      metadataService.updateSocialMetadata(entityType, entityId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminMetadataKeys.all });
    },
  });
};

export const useAdminSiteConfig = () =>
  useQuery({
    queryKey: adminSiteConfigKeys.detail(),
    queryFn: () => siteConfigService.getSiteConfig(),
  });

export const useUpdateAdminSiteConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSiteConfigDto) => siteConfigService.updateSiteConfig(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSiteConfigKeys.all });
    },
  });
};

export const usePublishAdminSiteConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => siteConfigService.publishSiteConfig(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminSiteConfigKeys.all });
    },
  });
};

export const useAdminSiteConfigReadiness = () =>
  useQuery({
    queryKey: [...adminSiteConfigKeys.all, "readiness"] as const,
    queryFn: () => siteConfigService.getReadiness(),
  });

export const useAdminSiteConfigVersions = () =>
  useQuery({
    queryKey: [...adminSiteConfigKeys.all, "versions"] as const,
    queryFn: () => siteConfigService.getVersions(),
  });
