export const adminArtistsKeys = {
  all: ["admin", "artists"] as const,
  lists: () => [...adminArtistsKeys.all, "list"] as const,
  detail: (artistId: string) => [...adminArtistsKeys.all, "detail", artistId] as const,
};

export const adminReleasesKeys = {
  all: ["admin", "releases"] as const,
  lists: () => [...adminReleasesKeys.all, "list"] as const,
  detail: (releaseId: string) => [...adminReleasesKeys.all, "detail", releaseId] as const,
};

export const adminMediaKeys = {
  all: ["admin", "media"] as const,
  lists: () => [...adminMediaKeys.all, "list"] as const,
  detail: (assetId: string) => [...adminMediaKeys.all, "detail", assetId] as const,
};

export const adminGalleryKeys = {
  all: ["admin", "gallery"] as const,
  lists: () => [...adminGalleryKeys.all, "list"] as const,
  detail: (galleryItemId: string) => [...adminGalleryKeys.all, "detail", galleryItemId] as const,
};

export const adminMetadataKeys = {
  all: ["admin", "metadata"] as const,
  lists: () => [...adminMetadataKeys.all, "list"] as const,
  detail: (metadataRecordId: string) => [...adminMetadataKeys.all, "detail", metadataRecordId] as const,
};

export const adminSiteConfigKeys = {
  all: ["admin", "site-config"] as const,
  detail: () => [...adminSiteConfigKeys.all, "detail"] as const,
};
