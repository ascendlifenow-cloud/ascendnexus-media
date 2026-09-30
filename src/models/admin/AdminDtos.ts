import type { ArtistAdminRecord } from "./ArtistAdminRecord";
import type { MediaAssetRecord } from "./MediaAssetRecord";
import type { PublicSiteConfig } from "./PublicSiteConfig";
import type { SongReleaseAdminRecord } from "./SongReleaseAdminRecord";
import type { PublicGalleryItem } from "../gallery";

export type CreateArtistDto = Omit<
  ArtistAdminRecord,
  "artistId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
> & {
  artistId?: string;
};
export type UpdateArtistDto = Partial<Omit<ArtistAdminRecord, "artistId" | "createdAt" | "createdBy">>;
export interface PublishArtistDto {
  updatedBy?: string;
}
export interface ArchiveArtistDto {
  reason?: string;
  updatedBy?: string;
}

export type CreateReleaseDto = Omit<
  SongReleaseAdminRecord,
  "releaseId" | "songId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
> & {
  releaseId?: string;
  songId?: string;
};
export type UpdateReleaseDto = Partial<Omit<SongReleaseAdminRecord, "releaseId" | "songId" | "createdAt" | "createdBy">>;
export interface PublishReleaseDto {
  updatedBy?: string;
}
export interface ArchiveReleaseDto {
  reason?: string;
  updatedBy?: string;
}

export type CreateMediaAssetDto = Omit<MediaAssetRecord, "assetId" | "createdAt" | "updatedAt"> & {
  assetId?: string;
};
export type UpdateMediaAssetDto = Partial<Omit<MediaAssetRecord, "assetId" | "createdAt">>;

export type CreateGalleryItemDto = Omit<PublicGalleryItem, "galleryItemId" | "createdAt" | "updatedAt"> & {
  galleryItemId?: string;
};
export type UpdateGalleryItemDto = Partial<Omit<PublicGalleryItem, "galleryItemId" | "createdAt">>;

export type UpdateSiteConfigDto = Partial<PublicSiteConfig>;
